/** Column definition for a CSV sheet. */
export interface Column {
  field: string;
  header_name: string;
  col_type?: string;
}

/** A single row – maps column field names to cell values. */
export type Row = Record<string, any>;

/** Metadata about the underlying CSV file. */
export interface FileMeta {
  file_path: string;
  row_count: number;
  delimiter: string;
  size_bytes: number;
}

/** Full payload returned when reading a CSV file. */
export interface SheetData {
  columns: Column[];
  rows: Row[];
  meta: FileMeta;
}

/** Summary information about a file in the repo. */
export interface FileInfo {
  name: string;
  path: string;
  size_bytes: number;
  modified: string;
}
