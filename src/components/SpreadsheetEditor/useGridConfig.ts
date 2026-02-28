import { useMemo } from 'react';
import type { ColDef, CellClassParams } from 'ag-grid-community';
import type { Column } from '../../types/sheet';

type CellStyleFn = (params: CellClassParams) => Record<string, string> | undefined;

/**
 * Hook that builds AG Grid column definitions and the default column def
 * from the sheet's Column array.
 */
export function useGridConfig(
  columns: Column[],
  cellStyleFn?: CellStyleFn,
): {
  columnDefs: ColDef[];
  defaultColDef: ColDef;
} {
  const columnDefs = useMemo<ColDef[]>(() => {
    return columns.map((col) => ({
      field: col.field,
      headerName: col.header_name,
      editable: true,
      sortable: true,
      filter: true,
      resizable: true,
      cellStyle: cellStyleFn,
    }));
  }, [columns, cellStyleFn]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 100,
      editable: true,
      sortable: true,
      filter: true,
      resizable: true,
    }),
    [],
  );

  return { columnDefs, defaultColDef };
}
