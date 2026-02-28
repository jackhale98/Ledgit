import Papa from 'papaparse';
import {
  TableView,
  compareTables,
  CompareFlags,
  TableDiff,
  DiffRender,
  Merger,
} from 'daff';
import type { DiffResult, StructuredDiff, ModifiedCell } from '../types/diff';

/**
 * Parse a CSV string into a 2D array (first row is headers).
 */
function csvToTable(csv: string): any[][] {
  const parsed = Papa.parse(csv.trim(), { header: false });
  return parsed.data as any[][];
}

/**
 * Extract structured diff info from the daff highlight table.
 * The highlight table has a special first column with action markers:
 *   '+++' = added row, '---' = removed row, '->' = modified row
 * And a header row with column markers for added/removed columns.
 */
function extractStructuredDiff(highlightData: any[][]): StructuredDiff {
  const addedRows: number[] = [];
  const removedRows: number[] = [];
  const modifiedCells: ModifiedCell[] = [];
  const addedColumns: string[] = [];
  const removedColumns: string[] = [];

  if (highlightData.length === 0) {
    return { addedRows, removedRows, modifiedCells, addedColumns, removedColumns };
  }

  // First row is the column-level action row (if present)
  const colActionRow = highlightData[0];
  // Second row (index 1) is the header row
  const headerRow = highlightData.length > 1 ? highlightData[1] : [];

  // Detect added/removed columns from the column action row
  for (let c = 1; c < colActionRow.length; c++) {
    const marker = String(colActionRow[c] ?? '');
    const colName = String(headerRow[c] ?? `col_${c}`);
    if (marker === '+++') {
      addedColumns.push(colName);
    } else if (marker === '---') {
      removedColumns.push(colName);
    }
  }

  // Process data rows (skip action row and header row)
  let dataRowIndex = 0;
  for (let r = 2; r < highlightData.length; r++) {
    const row = highlightData[r];
    const action = String(row[0] ?? '');

    if (action === '+++') {
      addedRows.push(dataRowIndex);
    } else if (action === '---') {
      removedRows.push(dataRowIndex);
    } else if (action === '->') {
      // Modified row - check each cell
      for (let c = 1; c < row.length; c++) {
        const cellValue = String(row[c] ?? '');
        // daff marks modified cells with "old->new" format
        const arrowIndex = cellValue.indexOf('->');
        if (arrowIndex !== -1) {
          const colName = String(headerRow[c] ?? `col_${c}`);
          modifiedCells.push({
            row: dataRowIndex,
            col: colName,
            oldValue: cellValue.substring(0, arrowIndex).trim(),
            newValue: cellValue.substring(arrowIndex + 2).trim(),
          });
        }
      }
    }

    dataRowIndex++;
  }

  return { addedRows, removedRows, modifiedCells, addedColumns, removedColumns };
}

/**
 * Build a human-readable summary of the diff.
 */
function buildSummary(structured: StructuredDiff): string {
  const parts: string[] = [];

  if (structured.addedRows.length > 0) {
    parts.push(`${structured.addedRows.length} row(s) added`);
  }
  if (structured.removedRows.length > 0) {
    parts.push(`${structured.removedRows.length} row(s) removed`);
  }
  if (structured.modifiedCells.length > 0) {
    parts.push(`${structured.modifiedCells.length} cell(s) modified`);
  }
  if (structured.addedColumns.length > 0) {
    parts.push(`${structured.addedColumns.length} column(s) added`);
  }
  if (structured.removedColumns.length > 0) {
    parts.push(`${structured.removedColumns.length} column(s) removed`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No changes detected';
}

/**
 * Compare two CSV strings and return a full diff result.
 */
export function compareCsv(csvA: string, csvB: string): DiffResult {
  const tableA = new TableView(csvToTable(csvA));
  const tableB = new TableView(csvToTable(csvB));

  const flags = new CompareFlags();
  const alignment = compareTables(tableA, tableB, flags).align();

  // Let daff auto-size the highlight table
  const highlightTable = new TableView([]);
  const diff = new TableDiff(alignment, flags);
  diff.hilite(highlightTable);

  // Extract the actual data from the highlight table
  const resultData: any[][] = [];
  for (let r = 0; r < highlightTable.height; r++) {
    const row: any[] = [];
    for (let c = 0; c < highlightTable.width; c++) {
      row.push(highlightTable.getCell(c, r));
    }
    resultData.push(row);
  }

  // Generate HTML rendering
  const renderer = new DiffRender();
  renderer.render(highlightTable);
  const htmlDiff = renderer.html();

  // Extract structured diff
  const structuredDiff = extractStructuredDiff(resultData);
  const summary = buildSummary(structuredDiff);

  return { htmlDiff, structuredDiff, summary };
}

/**
 * Perform a three-way merge of CSV data.
 */
export function threeWayMerge(
  baseCsv: string,
  oursCsv: string,
  theirsCsv: string,
): { mergedCsv: string; hasConflicts: boolean; conflictCount: number } {
  const baseTable = new TableView(csvToTable(baseCsv));
  const oursTable = new TableView(csvToTable(oursCsv));
  const theirsTable = new TableView(csvToTable(theirsCsv));

  // Create output table from ours as starting point
  const oursData = csvToTable(oursCsv);
  const outputData = oursData.map((row) => [...row]);
  const outputTable = new TableView(outputData);

  const merger = new Merger(baseTable, oursTable, theirsTable);
  const conflictCount = merger.apply(outputTable);

  // Convert output table back to CSV
  const mergedRows: any[][] = [];
  for (let r = 0; r < outputTable.height; r++) {
    const row: any[] = [];
    for (let c = 0; c < outputTable.width; c++) {
      row.push(outputTable.getCell(c, r));
    }
    mergedRows.push(row);
  }

  const mergedCsv = Papa.unparse(mergedRows);

  return {
    mergedCsv,
    hasConflicts: conflictCount > 0,
    conflictCount,
  };
}
