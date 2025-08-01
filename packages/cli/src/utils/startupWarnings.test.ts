/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStartupWarnings } from './startupWarnings';
import fs from 'fs/promises';
import { getErrorMessage } from '@vybestack/llxprt-code-core';

vi.mock('fs/promises');
vi.mock('@vybestack/llxprt-code-core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getErrorMessage: vi.fn(),
  };
});

/**
 * Tests for startup warnings functionality.
 * These tests verify the behavior of reading and deleting temporary warning files
 * that may be created during CLI startup to communicate issues to the user.
 */
describe('startupWarnings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return warnings from the file and delete it', async () => {
    const mockWarnings = 'Warning 1\nWarning 2';
    vi.mocked(fs.access).mockResolvedValue();
    vi.mocked(fs.readFile).mockResolvedValue(mockWarnings);
    vi.mocked(fs.unlink).mockResolvedValue();

    const warnings = await getStartupWarnings();

    expect(fs.access).toHaveBeenCalled();
    expect(fs.readFile).toHaveBeenCalled();
    expect(fs.unlink).toHaveBeenCalled();
    expect(warnings).toEqual(['Warning 1', 'Warning 2']);
  });

  it('should return an empty array if the file does not exist', async () => {
    const error = new Error('File not found');
    (error as Error & { code: string }).code = 'ENOENT';
    vi.mocked(fs.access).mockRejectedValue(error);

    const warnings = await getStartupWarnings();

    expect(warnings).toEqual([]);
  });

  it('should return an error message if reading the file fails', async () => {
    const error = new Error('Permission denied');
    vi.mocked(fs.access).mockRejectedValue(error);
    vi.mocked(getErrorMessage).mockReturnValue('Permission denied');

    const warnings = await getStartupWarnings();

    expect(warnings).toEqual([
      'Error checking/reading warnings file: Permission denied',
    ]);
  });

  it('should return a warning if deleting the file fails', async () => {
    const mockWarnings = 'Warning 1';
    vi.mocked(fs.access).mockResolvedValue();
    vi.mocked(fs.readFile).mockResolvedValue(mockWarnings);
    vi.mocked(fs.unlink).mockRejectedValue(new Error('Permission denied'));

    const warnings = await getStartupWarnings();

    expect(warnings).toEqual([
      'Warning 1',
      'Warning: Could not delete temporary warnings file.',
    ]);
  });
});
