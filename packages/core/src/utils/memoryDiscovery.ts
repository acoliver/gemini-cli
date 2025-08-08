/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { bfsFileSearch } from './bfsFileSearch.js';
import {
  LLXPRT_CONFIG_DIR,
  getAllContextFilenames,
} from '../tools/memoryTool.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { processImports } from './memoryImportProcessor.js';
import {
  DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
  FileFilteringOptions,
} from '../config/config.js';

// Simple console logger, similar to the one previously in CLI's config.ts
// TODO: Integrate with a more robust server-side logger if available/appropriate.
const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args: any[]) => {
    if (process.env.DEBUG) {
      console.debug('[DEBUG] [MemoryDiscovery]', ...args);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args: any[]) => console.warn('[WARN] [MemoryDiscovery]', ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args: any[]) =>
    console.error('[ERROR] [MemoryDiscovery]', ...args),
};

interface GeminiFileContent {
  filePath: string;
  content: string | null;
}

async function findProjectRoot(startDir: string): Promise<string | null> {
  let currentDir = path.resolve(startDir);
  while (true) {
    const gitPath = path.join(currentDir, '.git');
    try {
      const stats = await fs.lstat(gitPath);
      if (stats.isDirectory()) {
        return currentDir;
      }
    } catch (error: unknown) {
      // Don't log ENOENT errors as they're expected when .git doesn't exist
      // Also don't log errors in test environments, which often have mocked fs
      const isENOENT =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT';

      // Only log unexpected errors in non-test environments
      // process.env.NODE_ENV === 'test' or VITEST are common test indicators
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST;

      if (!isENOENT && !isTestEnv) {
        if (typeof error === 'object' && error !== null && 'code' in error) {
          const fsError = error as { code: string; message: string };
          logger.warn(
            `Error checking for .git directory at ${gitPath}: ${fsError.message}`,
          );
        } else {
          logger.warn(
            `Non-standard error checking for .git directory at ${gitPath}: ${String(error)}`,
          );
        }
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

async function getContextFilePathsInternal(
  currentWorkingDirectory: string,
  includeDirectoriesToReadContext: readonly string[],
  userHomePath: string,
  debugMode: boolean,
  fileService: FileDiscoveryService,
  extensionContextFilePaths: string[] = [],
  fileFilteringOptions: FileFilteringOptions,
  maxDirs: number,
): Promise<string[]> {
  const dirs = new Set<string>([
    ...includeDirectoriesToReadContext,
    currentWorkingDirectory,
  ]);
  const paths = [];
  for (const dir of dirs) {
    const pathsByDir = await getContextFilePathsInternalForEachDir(
      dir,
      userHomePath,
      debugMode,
      fileService,
      extensionContextFilePaths,
      fileFilteringOptions,
      maxDirs,
    );
    paths.push(...pathsByDir);
  }
  return Array.from(new Set<string>(paths));
}

async function getContextFilePathsInternalForEachDir(
  dir: string,
  userHomePath: string,
  debugMode: boolean,
  fileService: FileDiscoveryService,
  extensionContextFilePaths: string[] = [],
  fileFilteringOptions: FileFilteringOptions,
  maxDirs: number,
): Promise<string[]> {
  const allPaths = new Set<string>();
  const contextFilenames = getAllContextFilenames();

  for (const contextFilename of contextFilenames) {
    const resolvedHome = path.resolve(userHomePath);
    const globalMemoryPath = path.join(
      resolvedHome,
      LLXPRT_CONFIG_DIR,
      contextFilename,
    );

    // This part that finds the global file always runs.
    try {
      await fs.access(globalMemoryPath, fsSync.constants.R_OK);
      allPaths.add(globalMemoryPath);
      if (debugMode)
        logger.debug(
          `Found readable global ${contextFilename}: ${globalMemoryPath}`,
        );
    } catch {
      // It's okay if it's not found.
    }

    // FIX: Only perform the workspace search (upward and downward scans)
    // if a valid currentWorkingDirectory is provided.
    if (dir) {
      const resolvedCwd = path.resolve(dir);
      if (debugMode)
        logger.debug(
          `Searching for ${contextFilename} starting from CWD: ${resolvedCwd}`,
        );

      const projectRoot = await findProjectRoot(resolvedCwd);
      if (debugMode)
        logger.debug(`Determined project root: ${projectRoot ?? 'None'}`);

      const upwardPaths: string[] = [];
      let currentDir = resolvedCwd;
      const ultimateStopDir = projectRoot
        ? path.dirname(projectRoot)
        : path.dirname(resolvedHome);

      while (currentDir && currentDir !== path.dirname(currentDir)) {
        // Loop until filesystem root or currentDir is empty
        if (debugMode) {
          logger.debug(
            `Checking for ${contextFilename} in (upward scan): ${currentDir}`,
          );
        }

        // Skip the global .llxprt directory itself during upward scan from CWD,
        // as global is handled separately and explicitly first.
        if (currentDir === path.join(resolvedHome, LLXPRT_CONFIG_DIR)) {
          if (debugMode) {
            logger.debug(
              `Upward scan reached global config dir path, stopping upward search here: ${currentDir}`,
            );
          }
          break;
        }

        const potentialPath = path.join(currentDir, contextFilename);
        try {
          await fs.access(potentialPath, fsSync.constants.R_OK);
          if (potentialPath !== globalMemoryPath) {
            upwardPaths.unshift(potentialPath);
          }
        } catch {
          // Not found, continue.
        }

        if (currentDir === ultimateStopDir) {
          break;
        }

        currentDir = path.dirname(currentDir);
      }
      upwardPaths.forEach((p) => allPaths.add(p));

      const mergedOptions = {
        ...DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
        ...fileFilteringOptions,
      };

      const downwardPaths = await bfsFileSearch(resolvedCwd, {
        fileName: contextFilename,
        maxDirs,
        debug: debugMode,
        fileService,
        fileFilteringOptions: mergedOptions,
      });
      downwardPaths.sort();
      for (const dPath of downwardPaths) {
        allPaths.add(dPath);
      }
    }
  }

  // Add extension context file paths.
  for (const extensionPath of extensionContextFilePaths) {
    allPaths.add(extensionPath);
  }

  const finalPaths = Array.from(allPaths);

  if (debugMode)
    logger.debug(
      `Final ordered ${getAllContextFilenames()} paths to read: ${JSON.stringify(
        finalPaths,
      )}`,
    );
  return finalPaths;
}

async function readContextFiles(
  filePaths: string[],
  debugMode: boolean,
  importFormat: 'flat' | 'tree' = 'tree',
): Promise<GeminiFileContent[]> {
  const results: GeminiFileContent[] = [];
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Process imports in the content
      const processedResult = await processImports(
        content,
        path.dirname(filePath),
        debugMode,
        undefined,
        undefined,
        importFormat,
      );

      results.push({ filePath, content: processedResult.content });
      if (debugMode)
        logger.debug(
          `Successfully read and processed imports: ${filePath} (Length: ${processedResult.content.length})`,
        );
    } catch (error: unknown) {
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST;
      if (!isTestEnv) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Warning: Could not read ${getAllContextFilenames()} file at ${filePath}. Error: ${message}`,
        );
      }
      results.push({ filePath, content: null }); // Still include it with null content
      if (debugMode) logger.debug(`Failed to read: ${filePath}`);
    }
  }
  return results;
}

function concatenateInstructions(
  instructionContents: GeminiFileContent[],
  // CWD is needed to resolve relative paths for display markers
  currentWorkingDirectoryForDisplay: string,
): string {
  return instructionContents
    .filter((item) => typeof item.content === 'string')
    .map((item) => {
      const trimmedContent = (item.content as string).trim();
      if (trimmedContent.length === 0) {
        return null;
      }
      const displayPath = path.isAbsolute(item.filePath)
        ? path.relative(currentWorkingDirectoryForDisplay, item.filePath)
        : item.filePath;
      return `--- Context from: ${displayPath} ---\n${trimmedContent}\n--- End of Context from: ${displayPath} ---`;
    })
    .filter((block): block is string => block !== null)
    .join('\n\n');
}

/**
 * Loads hierarchical context files and concatenates their content.
 * This function is intended for use by the server.
 */
export async function loadServerHierarchicalMemory(
  currentWorkingDirectory: string,
  includeDirectoriesToReadContext: readonly string[],
  debugMode: boolean,
  fileService: FileDiscoveryService,
  extensionContextFilePaths: string[] = [],
  importFormat: 'flat' | 'tree' = 'tree',
  fileFilteringOptions?: FileFilteringOptions,
  maxDirs: number = 200,
): Promise<{ memoryContent: string; fileCount: number }> {
  if (debugMode)
    logger.debug(
      `Loading server hierarchical memory for CWD: ${currentWorkingDirectory} (importFormat: ${importFormat})`,
    );

  // For the server, homedir() refers to the server process's home.
  // This is consistent with how MemoryTool already finds the global path.
  const userHomePath = homedir();
  const filePaths = await getContextFilePathsInternal(
    currentWorkingDirectory,
    includeDirectoriesToReadContext,
    userHomePath,
    debugMode,
    fileService,
    extensionContextFilePaths,
    fileFilteringOptions || DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
    maxDirs,
  );
  if (filePaths.length === 0) {
    if (debugMode)
      logger.debug('No context files found in hierarchy of the workspace.');
    return { memoryContent: '', fileCount: 0 };
  }
  const contentsWithPaths = await readContextFiles(
    filePaths,
    debugMode,
    importFormat,
  );
  // Pass CWD for relative path display in concatenated content
  const combinedInstructions = concatenateInstructions(
    contentsWithPaths,
    currentWorkingDirectory,
  );
  if (debugMode)
    logger.debug(
      `Combined instructions length: ${combinedInstructions.length}`,
    );
  if (debugMode && combinedInstructions.length > 0)
    logger.debug(
      `Combined instructions (snippet): ${combinedInstructions.substring(0, 500)}...`,
    );
  return {
    memoryContent: combinedInstructions,
    fileCount: contentsWithPaths.length,
  };
}
