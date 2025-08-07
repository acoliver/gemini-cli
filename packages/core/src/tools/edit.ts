/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Diff from 'diff';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Icon,
  ToolCallConfirmationDetails,
  ToolConfirmationOutcome,
  ToolEditConfirmationDetails,
  ToolInvocation,
  ToolLocation,
  ToolResult,
  ToolResultDisplay,
} from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { Type } from '@google/genai';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import { isNodeError } from '../utils/errors.js';
import { Config, ApprovalMode } from '../config/config.js';
import { ensureCorrectEdit } from '../utils/editCorrector.js';
import { DEFAULT_DIFF_OPTIONS } from './diffOptions.js';
import { ReadFileTool } from './read-file.js';
import { ModifiableTool, ModifyContext } from './modifiable-tool.js';

/**
 * Parameters for the Edit tool
 */
export interface EditToolParams {
  /**
   * The absolute path to the file to modify
   */
  file_path: string;

  /**
   * The text to replace
   */
  old_string: string;

  /**
   * The text to replace it with
   */
  new_string: string;

  /**
   * Number of replacements expected. Defaults to 1 if not specified.
   * Use when you want to replace multiple occurrences.
   */
  expected_replacements?: number;

  /**
   * Whether the edit was modified manually by the user.
   */
  modified_by_user?: boolean;
}

interface CalculatedEdit {
  currentContent: string | null;
  newContent: string;
  occurrences: number;
  error?: { display: string; raw: string; type: ToolErrorType };
  isNewFile: boolean;
}

export function applyReplacement(
  currentContent: string | null,
  oldString: string,
  newString: string,
  isNewFile: boolean,
): string {
  if (isNewFile) {
    return newString;
  }
  if (currentContent === null) {
    // Should not happen if not a new file, but defensively return empty or newString if oldString is also empty
    return oldString === '' ? newString : '';
  }
  // If oldString is empty and it's not a new file, do not modify the content.
  if (oldString === '' && !isNewFile) {
    return currentContent;
  }
  return currentContent.replaceAll(oldString, newString);
}

/**
 * Implementation of a single edit tool invocation
 */
class EditToolInvocation extends BaseToolInvocation<
  EditToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: EditToolParams,
  ) {
    super(params);
  }

  toolLocations(): ToolLocation[] {
    return [{ path: this.params.file_path }];
  }

  /**
   * Calculates the potential outcome of an edit operation.
   * @param params Parameters for the edit operation
   * @returns An object describing the potential edit outcome
   * @throws File system errors if reading the file fails unexpectedly (e.g., permissions)
   */
  private async calculateEdit(
    params: EditToolParams,
    abortSignal: AbortSignal,
  ): Promise<CalculatedEdit> {
    const expectedReplacements = params.expected_replacements ?? 1;
    let currentContent: string | null = null;
    let fileExists = false;
    let isNewFile = false;
    let finalNewString = params.new_string;
    let finalOldString = params.old_string;
    let occurrences = 0;
    let error:
      | { display: string; raw: string; type: ToolErrorType }
      | undefined = undefined;

    try {
      currentContent = fs.readFileSync(params.file_path, 'utf8');
      // Normalize line endings to LF for consistent processing.
      currentContent = currentContent.replace(/\r\n/g, '\n');
      fileExists = true;
    } catch (err: unknown) {
      if (!isNodeError(err) || err.code !== 'ENOENT') {
        // Rethrow unexpected FS errors (permissions, etc.)
        throw err;
      }
      fileExists = false;
    }

    if (params.old_string === '' && !fileExists) {
      // Creating a new file
      isNewFile = true;
    } else if (!fileExists) {
      // Trying to edit a nonexistent file (and old_string is not empty)
      error = {
        display: `File not found. Cannot apply edit. Use an empty old_string to create a new file.`,
        raw: `File not found: ${params.file_path}`,
        type: ToolErrorType.FILE_NOT_FOUND,
      };
    } else if (currentContent !== null) {
      // Editing an existing file
      const correctedEdit = await ensureCorrectEdit(
        params.file_path,
        currentContent,
        params,
        this.config.getGeminiClient(),
        abortSignal,
      );
      finalOldString = correctedEdit.params.old_string;
      finalNewString = correctedEdit.params.new_string;
      occurrences = correctedEdit.occurrences;

      if (params.old_string === '') {
        // Error: Trying to create a file that already exists
        error = {
          display: `Failed to edit. Attempted to create a file that already exists.`,
          raw: `File already exists, cannot create: ${params.file_path}`,
          type: ToolErrorType.ATTEMPT_TO_CREATE_EXISTING_FILE,
        };
      } else if (finalOldString === finalNewString) {
        // No change
        error = {
          display: `No changes to apply. old_string and new_string are identical.`,
          raw: `No changes to apply to ${params.file_path}: old_string and new_string are identical.`,
          type: ToolErrorType.EDIT_NO_CHANGE,
        };
      } else if (occurrences === 0) {
        // No occurrences found
        error = {
          display: `Failed to edit, could not find the string to replace.`,
          raw: `0 occurrences found for old_string in file ${params.file_path}. Expected ${expectedReplacements}.`,
          type: ToolErrorType.EDIT_NO_OCCURRENCE_FOUND,
        };
      } else if (occurrences !== expectedReplacements) {
        // Wrong number of occurrences
        error = {
          display: `Failed to edit, expected ${expectedReplacements} ${expectedReplacements === 1 ? 'occurrence' : 'occurrences'} but found ${occurrences}`,
          raw: `Expected ${expectedReplacements} ${expectedReplacements === 1 ? 'occurrence' : 'occurrences'} but found ${occurrences} for old_string in file ${params.file_path}.`,
          type: ToolErrorType.EDIT_EXPECTED_OCCURRENCE_MISMATCH,
        };
      }
    } else {
      // Should not happen if fileExists and no exception was thrown, but defensively:
      error = {
        display: `Failed to read content of file.`,
        raw: `Failed to read content of existing file: ${params.file_path}`,
        type: ToolErrorType.READ_CONTENT_FAILURE,
      };
    }

    const newContent = applyReplacement(
      currentContent,
      finalOldString,
      finalNewString,
      isNewFile,
    );

    return {
      currentContent,
      newContent,
      occurrences,
      error,
      isNewFile,
    };
  }

  /**
   * Handles the confirmation prompt for the Edit tool in the CLI.
   * It needs to calculate the diff to show the user.
   */
  async shouldConfirmExecute(
    abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    const approvalMode = this.config.getApprovalMode();
    if (
      approvalMode === ApprovalMode.AUTO_EDIT ||
      approvalMode === ApprovalMode.YOLO
    ) {
      return false;
    }

    let editData: CalculatedEdit;
    try {
      editData = await this.calculateEdit(this.params, abortSignal);
    } catch (error) {
      console.error('Failed to calculate edit:', error);
      return false;
    }

    if (editData.error) {
      return false;
    }

    const fileName = path.basename(this.params.file_path);
    const fileDiff = Diff.createPatch(
      fileName,
      editData.currentContent ?? '',
      editData.newContent,
      'Current',
      'Proposed',
      DEFAULT_DIFF_OPTIONS,
    );
    const confirmationDetails: ToolEditConfirmationDetails = {
      type: 'edit',
      title: `Confirm Edit: ${shortenPath(makeRelative(this.params.file_path, this.config.getTargetDir()))}`,
      fileName,
      fileDiff,
      originalContent: editData.currentContent,
      newContent: editData.newContent,
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          this.config.setApprovalMode(ApprovalMode.AUTO_EDIT);
        }
      },
    };
    return confirmationDetails;
  }

  getDescription(): string {
    const relativePath = makeRelative(
      this.params.file_path,
      this.config.getTargetDir(),
    );
    if (this.params.old_string === '') {
      return `Create ${shortenPath(relativePath)}`;
    }

    const oldStringSnippet =
      this.params.old_string.split('\n')[0].substring(0, 30) +
      (this.params.old_string.length > 30 ? '...' : '');
    const newStringSnippet =
      this.params.new_string.split('\n')[0].substring(0, 30) +
      (this.params.new_string.length > 30 ? '...' : '');

    if (this.params.old_string === this.params.new_string) {
      return `No file changes to ${shortenPath(relativePath)}`;
    }
    return `${shortenPath(relativePath)}: ${oldStringSnippet} => ${newStringSnippet}`;
  }

  /**
   * Executes the edit operation with the given parameters.
   * @param params Parameters for the edit operation
   * @returns Result of the edit operation
   */
  async execute(signal: AbortSignal): Promise<ToolResult> {
    let editData: CalculatedEdit;
    try {
      editData = await this.calculateEdit(this.params, signal);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error preparing edit: ${errorMsg}`,
        returnDisplay: `Error preparing edit: ${errorMsg}`,
        error: {
          message: errorMsg,
          type: ToolErrorType.EDIT_PREPARATION_FAILURE,
        },
      };
    }

    if (editData.error) {
      return {
        llmContent: editData.error.raw,
        returnDisplay: `Error: ${editData.error.display}`,
        error: {
          message: editData.error.raw,
          type: editData.error.type,
        },
      };
    }

    try {
      this.ensureParentDirectoriesExist(this.params.file_path);
      fs.writeFileSync(this.params.file_path, editData.newContent, 'utf8');

      let displayResult: ToolResultDisplay;
      if (editData.isNewFile) {
        displayResult = `Created ${shortenPath(makeRelative(this.params.file_path, this.config.getTargetDir()))}`;
      } else {
        // Generate diff for display, even though core logic doesn't technically need it
        // The CLI wrapper will use this part of the ToolResult
        const fileName = path.basename(this.params.file_path);
        const fileDiff = Diff.createPatch(
          fileName,
          editData.currentContent ?? '', // Should not be null here if not isNewFile
          editData.newContent,
          'Current',
          'Proposed',
          DEFAULT_DIFF_OPTIONS,
        );
        displayResult = {
          fileDiff,
          fileName,
          originalContent: editData.currentContent,
          newContent: editData.newContent,
        };
      }

      const llmSuccessMessageParts = [
        editData.isNewFile
          ? `Created new file: ${this.params.file_path} with provided content.`
          : `Successfully modified file: ${this.params.file_path} (${editData.occurrences} replacements).`,
      ];
      if (this.params.modified_by_user) {
        llmSuccessMessageParts.push(
          `User modified the \`new_string\` content to be: ${this.params.new_string}.`,
        );
      }

      return {
        llmContent: llmSuccessMessageParts.join(' '),
        returnDisplay: displayResult,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Failed to write file: ${message}`,
        returnDisplay: `Error: Failed to write file: ${message}`,
        error: {
          message,
          type: ToolErrorType.FILE_WRITE_FAILURE,
        },
      };
    }
  }

  /**
   * Creates parent directories if they don't exist
   */
  private ensureParentDirectoriesExist(filePath: string): void {
    const dirName = path.dirname(filePath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
  }
}

/**
 * Implementation of the Edit tool logic
 */
export class EditTool
  extends BaseDeclarativeTool<EditToolParams, ToolResult>
  implements ModifiableTool<EditToolParams>
{
  static readonly Name = 'replace';

  constructor(private readonly config: Config) {
    super(
      EditTool.Name,
      'Edit',
      `Replaces text within a file. By default, replaces a single occurrence, but can replace multiple occurrences when \`expected_replacements\` is specified. This tool requires providing significant context around the change to ensure precise targeting. Always use the ${ReadFileTool.Name} tool to examine the file's current content before attempting a text replacement.

      The user has the ability to modify the \`new_string\` content. If modified, this will be stated in the response.

Expectation for required parameters:
1. \`file_path\` MUST be an absolute path; otherwise an error will be thrown.
2. \`old_string\` MUST be the exact literal text to replace (including all whitespace, indentation, newlines, and surrounding code etc.).
3. \`new_string\` MUST be the exact literal text to replace \`old_string\` with (also including all whitespace, indentation, newlines, and surrounding code etc.). Ensure the resulting code is correct and idiomatic.
4. NEVER escape \`old_string\` or \`new_string\`, that would break the exact literal text requirement.
**Important:** If ANY of the above are not satisfied, the tool will fail. CRITICAL for \`old_string\`: Must uniquely identify the single instance to change. Include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. If this string matches multiple locations, or does not match exactly, the tool will fail.
**Multiple replacements:** Set \`expected_replacements\` to the number of occurrences you want to replace. The tool will replace ALL occurrences that match \`old_string\` exactly. Ensure the number of replacements matches your expectation.`,
      Icon.Pencil,
      {
        properties: {
          file_path: {
            description:
              "The absolute path to the file to modify. Must start with '/'.",
            type: Type.STRING,
          },
          old_string: {
            description:
              'The exact literal text to replace, preferably unescaped. For single replacements (default), include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. For multiple replacements, specify expected_replacements parameter. If this string is not the exact literal text (i.e. you escaped it) or does not match exactly, the tool will fail.',
            type: Type.STRING,
          },
          new_string: {
            description:
              'The exact literal text to replace `old_string` with, preferably unescaped. Provide the EXACT text. Ensure the resulting code is correct and idiomatic.',
            type: Type.STRING,
          },
          expected_replacements: {
            type: Type.NUMBER,
            description:
              'Number of replacements expected. Defaults to 1 if not specified. Use when you want to replace multiple occurrences.',
            minimum: 1,
          },
        },
        required: ['file_path', 'old_string', 'new_string'],
        type: Type.OBJECT,
      },
    );
  }

  /**
   * Validates the parameters for the Edit tool
   * @param params Parameters to validate
   * @returns Error message string or null if valid
   */
  validateToolParams(params: EditToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!path.isAbsolute(params.file_path)) {
      return `File path must be absolute: ${params.file_path}`;
    }

    const workspaceContext = this.config.getWorkspaceContext();
    if (!workspaceContext.isPathWithinWorkspace(params.file_path)) {
      const directories = workspaceContext.getDirectories();
      return `File path must be within one of the workspace directories: ${directories.join(', ')}`;
    }

    return null;
  }

  /**
   * Creates an invocation for the given parameters
   */
  protected createInvocation(
    params: EditToolParams,
  ): ToolInvocation<EditToolParams, ToolResult> {
    return new EditToolInvocation(this.config, params);
  }

  getModifyContext(_: AbortSignal): ModifyContext<EditToolParams> {
    return {
      getFilePath: (params: EditToolParams) => params.file_path,
      getCurrentContent: async (params: EditToolParams): Promise<string> => {
        try {
          return fs.readFileSync(params.file_path, 'utf8');
        } catch (err) {
          if (!isNodeError(err) || err.code !== 'ENOENT') throw err;
          return '';
        }
      },
      getProposedContent: async (params: EditToolParams): Promise<string> => {
        try {
          const currentContent = fs.readFileSync(params.file_path, 'utf8');
          return applyReplacement(
            currentContent,
            params.old_string,
            params.new_string,
            params.old_string === '' && currentContent === '',
          );
        } catch (err) {
          if (!isNodeError(err) || err.code !== 'ENOENT') throw err;
          return '';
        }
      },
      createUpdatedParams: (
        _currentContent: string,
        newContent: string,
        params: EditToolParams,
      ): EditToolParams => ({
        ...params,
        new_string: newContent,
        modified_by_user: true,
      }),
    };
  }
}
