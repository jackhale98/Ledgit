/** A single cell that changed between two versions. */
export interface ModifiedCell {
  row: number;
  col: string;
  oldValue: string;
  newValue: string;
}

/** Structured representation of the differences between two CSV snapshots. */
export interface StructuredDiff {
  addedRows: number[];
  removedRows: number[];
  modifiedCells: ModifiedCell[];
  addedColumns: string[];
  removedColumns: string[];
}

/** Complete diff result including HTML rendering and structured data. */
export interface DiffResult {
  htmlDiff: string;
  structuredDiff: StructuredDiff;
  summary: string;
}
