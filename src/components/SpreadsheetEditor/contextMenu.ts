import type { MenuItemDef } from 'ag-grid-community';
import type { Column } from '../../types/sheet';

interface ContextMenuDeps {
  addRow: (atIndex?: number) => void;
  removeRow: (rowIndex: number) => void;
  addColumn: (column: Column, atIndex?: number) => void;
  removeColumn: (field: string) => void;
  columns: Column[];
}

/**
 * Build the context menu items for the AG Grid spreadsheet.
 */
export function getContextMenuItems(deps: ContextMenuDeps): MenuItemDef[] {
  const { addRow, removeRow, addColumn, removeColumn, columns } = deps;

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
  ];
}
