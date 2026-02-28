import type { Column, Row } from '../types/sheet';

/**
 * Generate a descriptive git commit message based on the changes
 * made to a CSV file.
 */
export function generateCommitMessage(
  filePath: string,
  oldColumns: Column[],
  newColumns: Column[],
  oldRows: Row[],
  newRows: Row[],
): string {
  const fileName = filePath.split('/').pop() ?? filePath;
  const parts: string[] = [];

  // Detect column changes
  const oldFields = new Set(oldColumns.map((c) => c.field));
  const newFields = new Set(newColumns.map((c) => c.field));

  const addedCols = newColumns.filter((c) => !oldFields.has(c.field));
  const removedCols = oldColumns.filter((c) => !newFields.has(c.field));

  if (addedCols.length > 0) {
    parts.push(`add column(s): ${addedCols.map((c) => c.header_name).join(', ')}`);
  }
  if (removedCols.length > 0) {
    parts.push(`remove column(s): ${removedCols.map((c) => c.header_name).join(', ')}`);
  }

  // Detect row count changes
  const rowDiff = newRows.length - oldRows.length;
  if (rowDiff > 0) {
    parts.push(`add ${rowDiff} row(s)`);
  } else if (rowDiff < 0) {
    parts.push(`remove ${Math.abs(rowDiff)} row(s)`);
  }

  // Detect cell edits (only if row and column counts match)
  if (rowDiff === 0 && addedCols.length === 0 && removedCols.length === 0) {
    let editCount = 0;
    const sharedFields = newColumns.map((c) => c.field);
    for (let i = 0; i < Math.min(oldRows.length, newRows.length); i++) {
      for (const field of sharedFields) {
        if (String(oldRows[i]?.[field] ?? '') !== String(newRows[i]?.[field] ?? '')) {
          editCount++;
        }
      }
    }
    if (editCount > 0) {
      parts.push(`edit ${editCount} cell(s)`);
    }
  }

  if (parts.length === 0) {
    return `Update ${fileName}`;
  }

  return `${fileName}: ${parts.join('; ')}`;
}

/**
 * Format a byte count into a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
