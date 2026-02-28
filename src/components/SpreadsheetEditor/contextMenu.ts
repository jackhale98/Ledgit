import type { MenuItemDef } from 'ag-grid-community';
import type { Column } from '../../types/sheet';

interface ContextMenuDeps {
  addRow: (atIndex?: number) => void;
  removeRow: (rowIndex: number) => void;
  moveRow: (fromIndex: number, toIndex: number) => void;
  addColumn: (column: Column, atIndex?: number) => void;
  removeColumn: (field: string) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;
  columns: Column[];
  rowCount: number;
}

/**
 * Build the context menu items for the AG Grid spreadsheet.
 */
export function getContextMenuItems(deps: ContextMenuDeps): MenuItemDef[] {
  const { addRow, removeRow, moveRow, addColumn, removeColumn, moveColumn, columns, rowCount } = deps;

  return [
    {
      name: 'Add Row Above',
      action: (params) => {
        const rowIndex = params.node?.rowIndex;
        if (rowIndex != null) {
          addRow(rowIndex);
        }
      },
    },
    {
      name: 'Add Row Below',
      action: (params) => {
        const rowIndex = params.node?.rowIndex;
        if (rowIndex != null) {
          addRow(rowIndex + 1);
        }
      },
    },
    {
      name: 'Delete Row',
      action: (params) => {
        const rowIndex = params.node?.rowIndex;
        if (rowIndex != null) {
          removeRow(rowIndex);
        }
      },
    },
    {
      name: 'Move Row Up',
      disabled: false,
      action: (params) => {
        const rowIndex = params.node?.rowIndex;
        if (rowIndex != null && rowIndex > 0) {
          moveRow(rowIndex, rowIndex - 1);
        }
      },
    },
    {
      name: 'Move Row Down',
      disabled: false,
      action: (params) => {
        const rowIndex = params.node?.rowIndex;
        if (rowIndex != null && rowIndex < rowCount - 1) {
          moveRow(rowIndex, rowIndex + 1);
        }
      },
    },
    'separator' as unknown as MenuItemDef,
    {
      name: 'Add Column',
      action: () => {
        const name = prompt('Enter column name:');
        if (name) {
          const field = name.toLowerCase().replace(/\s+/g, '_');
          addColumn({ field, header_name: name });
        }
      },
    },
    {
      name: 'Delete Column',
      subMenu: columns.map((col) => ({
        name: col.header_name,
        action: () => {
          removeColumn(col.field);
        },
      })),
    },
    {
      name: 'Move Column Left',
      action: (params) => {
        const field = params.column?.getColId();
        if (!field) return;
        const colIndex = columns.findIndex((c) => c.field === field);
        if (colIndex > 0) {
          moveColumn(colIndex, colIndex - 1);
        }
      },
    },
    {
      name: 'Move Column Right',
      action: (params) => {
        const field = params.column?.getColId();
        if (!field) return;
        const colIndex = columns.findIndex((c) => c.field === field);
        if (colIndex >= 0 && colIndex < columns.length - 1) {
          moveColumn(colIndex, colIndex + 1);
        }
      },
    },
  ];
}
