import React, { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellValueChangedEvent, GridReadyEvent, RowDragEndEvent, DragStoppedEvent, GridApi } from 'ag-grid-community';
import { useSheetStore } from '../../stores/useSheetStore';
import { useDiffHighlighting } from '../../hooks/useDiffHighlighting';
import { useGridConfig } from './useGridConfig';
import { getContextMenuItems } from './contextMenu';

export const SpreadsheetEditor: React.FC = () => {
  const columns = useSheetStore((s) => s.columns);
  const rows = useSheetStore((s) => s.rows);
  const filePath = useSheetStore((s) => s.filePath);
  const updateCell = useSheetStore((s) => s.updateCell);
  const addRow = useSheetStore((s) => s.addRow);
  const removeRow = useSheetStore((s) => s.removeRow);
  const moveRow = useSheetStore((s) => s.moveRow);
  const addColumn = useSheetStore((s) => s.addColumn);
  const removeColumn = useSheetStore((s) => s.removeColumn);
  const moveColumn = useSheetStore((s) => s.moveColumn);
  const reorderColumns = useSheetStore((s) => s.reorderColumns);

  const gridApiRef = useRef<GridApi | null>(null);

  const diffCellStyle = useDiffHighlighting();
  const { columnDefs, defaultColDef } = useGridConfig(columns, diffCellStyle);

  const rowData = useMemo(() => {
    return rows.map((row, index) => ({ ...row, __rowIndex: index }));
  }, [rows]);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      const rowIndex = event.data.__rowIndex as number;
      const field = event.colDef.field;
      if (field && field !== '__rowIndex') {
        updateCell(rowIndex, field, event.newValue);
      }
    },
    [updateCell],
  );

  const onGridReady = useCallback((event: GridReadyEvent) => {
    gridApiRef.current = event.api;
  }, []);

  const onRowDragEnd = useCallback(
    (event: RowDragEndEvent) => {
      const fromIndex = event.node.data?.__rowIndex as number | undefined;
      const toIndex = event.overIndex;
      if (fromIndex != null && toIndex != null && toIndex >= 0) {
        moveRow(fromIndex, toIndex);
      }
    },
    [moveRow],
  );

  const onDragStopped = useCallback(
    (_event: DragStoppedEvent) => {
      const api = gridApiRef.current;
      if (!api) return;
      const gridCols = api.getColumnDefs();
      if (!gridCols) return;
      // Extract the field names from the new column order, skipping the drag handle column
      const newOrder = gridCols
        .filter((col: any) => col.field && col.field !== '')
        .map((col: any) => col.field as string);
      reorderColumns(newOrder);
    },
    [reorderColumns],
  );

  const contextMenuItems = useMemo(
    () =>
      getContextMenuItems({
        addRow,
        removeRow,
        moveRow,
        addColumn,
        removeColumn,
        moveColumn,
        columns,
        rowCount: rows.length,
      }),
    [addRow, removeRow, moveRow, addColumn, removeColumn, moveColumn, columns, rows.length],
  );

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg">No file open</p>
          <p className="mt-1 text-sm">Select a CSV file from the file explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
        <button
          onClick={() => addRow()}
          className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-100"
        >
          + Row
        </button>
        <button
          onClick={() => {
            const name = prompt('Enter column name:');
            if (name) {
              const field = name.toLowerCase().replace(/\s+/g, '_');
              addColumn({ field, header_name: name });
            }
          }}
          className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-100"
        >
          + Column
        </button>
      </div>
      <div className="ag-theme-alpine flex-1">
        <AgGridReact
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          onGridReady={onGridReady}
          onRowDragEnd={onRowDragEnd}
          onDragStopped={onDragStopped}
          getRowId={(params) => String(params.data.__rowIndex)}
          undoRedoCellEditing={false}
          getContextMenuItems={() => contextMenuItems}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
          rowDragManaged={true}
          animateRows={true}
        />
      </div>
    </div>
  );
};
