import { invoke } from '@tauri-apps/api/core';
import type { SheetData, Column, Row, FileInfo } from '../types/sheet';

/**
 * Read a CSV file and return structured sheet data.
 */
export async function readCsv(filePath: string): Promise<SheetData> {
  return invoke<SheetData>('file_read_csv', { filePath });
}

/**
 * Write columns and rows back to a CSV file.
 */
export async function writeCsv(
  filePath: string,
  columns: Column[],
  rows: Row[],
): Promise<{ bytesWritten: number }> {
  return invoke<{ bytesWritten: number }>('file_write_csv', {
    filePath,
    columns,
    rows,
  });
}

/**
 * List all CSV files tracked in the repository.
 */
export async function list(): Promise<FileInfo[]> {
  return invoke<FileInfo[]>('file_list');
}

/**
 * Create a new CSV file with the given columns (no rows yet).
 */
export async function create(
  fileName: string,
  columns: Column[],
): Promise<FileInfo> {
  return invoke<FileInfo>('file_create', { filePath: fileName, columns });
}

/**
 * Delete a CSV file from disk.
 */
export async function deleteCsv(filePath: string): Promise<void> {
  return invoke<void>('file_delete', { filePath });
}
