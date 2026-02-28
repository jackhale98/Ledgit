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
    const dragCol: ColDef = {
      rowDrag: true,
      width: 40,
      maxWidth: 40,
      suppressHeaderMenuButton: true,
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
      field: '',
      lockPosition: 'left',
      suppressMovable: true,
    };
    const dataCols: ColDef[] = columns.map((col) => ({
      field: col.field,
      headerName: col.header_name,
      editable: true,
      sortable: true,
      filter: true,
      resizable: true,
      cellStyle: cellStyleFn,
    }));
    return [dragCol, ...dataCols];
  }, [columns, cellStyleFn]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 120,
      editable: true,
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: false,
      resizable: true,
      filterParams: {
        buttons: ['reset', 'apply'],
      },
    }),
    [],
  );

  return { columnDefs, defaultColDef };
}
