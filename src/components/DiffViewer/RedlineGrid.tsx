import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellClassParams } from 'ag-grid-community';
import type { DiffResult } from '../../types/diff';

interface RedlineGridProps {
  diffResult: DiffResult;
}

const ADDED_BG = '#dcfce7';
const REMOVED_BG = '#fee2e2';
const MODIFIED_BG = '#fef9c3';

export const RedlineGrid: React.FC<RedlineGridProps> = ({ diffResult }) => {
  const { structuredDiff, htmlDiff } = diffResult;

  // If we have HTML diff, render it as HTML table
  // Otherwise show a simple message
  const hasHtml = htmlDiff && htmlDiff.trim().length > 0;

  const addedSet = useMemo(() => new Set(structuredDiff.addedRows), [structuredDiff]);
  const removedSet = useMemo(() => new Set(structuredDiff.removedRows), [structuredDiff]);
  const modifiedLookup = useMemo(() => {
    const lookup = new Set<string>();
    for (const mc of structuredDiff.modifiedCells) {
      lookup.add(`${mc.row}:${mc.col}`);
    }
    return lookup;
  }, [structuredDiff]);

  // Build column defs from the added/removed column info plus modified cells
  const allColumns = useMemo(() => {
    const cols = new Set<string>();
    for (const mc of structuredDiff.modifiedCells) {
      cols.add(mc.col);
    }
    for (const c of structuredDiff.addedColumns) {
      cols.add(c);
    }
    for (const c of structuredDiff.removedColumns) {
      cols.add(c);
    }
    return Array.from(cols);
  }, [structuredDiff]);

  const columnDefs = useMemo<ColDef[]>(() => {
    return allColumns.map((col) => ({
      field: col,
      headerName: col,
      editable: false,
      sortable: false,
      filter: false,
      resizable: true,
      flex: 1,
      minWidth: 100,
      headerClass: structuredDiff.addedColumns.includes(col)
        ? 'bg-green-100'
        : structuredDiff.removedColumns.includes(col)
          ? 'bg-red-100'
          : '',
      cellStyle: (params: CellClassParams): Record<string, string> | undefined => {
        const rowIndex = params.node?.rowIndex;
        if (rowIndex == null) return undefined;

        if (addedSet.has(rowIndex)) {
          return { backgroundColor: ADDED_BG };
        }
        if (removedSet.has(rowIndex)) {
          return { backgroundColor: REMOVED_BG };
        }
        if (modifiedLookup.has(`${rowIndex}:${col}`)) {
          return { backgroundColor: MODIFIED_BG };
        }
        return undefined;
      },
    }));
  }, [allColumns, addedSet, removedSet, modifiedLookup, structuredDiff]);

  // If we have HTML from daff, just render it directly
  if (hasHtml) {
    return (
      <div className="h-full overflow-auto p-4">
        <div
          className="daff-diff-table"
          dangerouslySetInnerHTML={{ __html: htmlDiff }}
        />
      </div>
    );
  }

  // Fallback: if no HTML and no structured data, show empty state
  if (allColumns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        No differences found
      </div>
    );
  }

  return (
    <div className="ag-theme-alpine h-full w-full">
      <AgGridReact
        columnDefs={columnDefs}
        rowData={[]}
        defaultColDef={{
          flex: 1,
          minWidth: 80,
          editable: false,
          sortable: false,
        }}
      />
    </div>
  );
};
