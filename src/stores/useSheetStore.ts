import { create } from 'zustand';
import type { Column, Row } from '../types/sheet';
import * as fileIpc from '../ipc/fileIpc';

interface Snapshot {
  columns: Column[];
  rows: Row[];
}

interface SheetState {
  columns: Column[];
  rows: Row[];
  filePath: string | null;

  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  undoStack: Snapshot[];
  redoStack: Snapshot[];

  loadFile: (filePath: string) => Promise<void>;
  updateCell: (rowIndex: number, field: string, value: any) => void;
  addRow: (atIndex?: number) => void;
  removeRow: (rowIndex: number) => void;
  moveRow: (fromIndex: number, toIndex: number) => void;
  addColumn: (column: Column, atIndex?: number) => void;
  removeColumn: (field: string) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;
  reorderColumns: (fieldOrder: string[]) => void;
  clearFile: () => void;
  save: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

const MAX_UNDO = 100;

function takeSnapshot(state: { columns: Column[]; rows: Row[] }): Snapshot {
  return {
    columns: state.columns.map((c) => ({ ...c })),
    rows: state.rows.map((r) => ({ ...r })),
  };
}

export const useSheetStore = create<SheetState>((set, get) => ({
  columns: [],
  rows: [],
  filePath: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  undoStack: [],
  redoStack: [],

  loadFile: async (filePath: string) => {
    const data = await fileIpc.readCsv(filePath);
    set({
      columns: data.columns,
      rows: data.rows,
      filePath,
      isDirty: false,
      undoStack: [],
      redoStack: [],
    });
  },

  updateCell: (rowIndex: number, field: string, value: any) => {
    const { columns, rows, undoStack } = get();
    const snapshot = takeSnapshot({ columns, rows });
    const newRows = rows.map((r, i) =>
      i === rowIndex ? { ...r, [field]: value } : r,
    );
    set({
      rows: newRows,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  addRow: (atIndex?: number) => {
    const { columns, rows, undoStack } = get();
    const snapshot = takeSnapshot({ columns, rows });
    const emptyRow: Row = {};
    for (const col of columns) {
      emptyRow[col.field] = '';
    }
    const newRows = [...rows];
    const idx = atIndex ?? newRows.length;
    newRows.splice(idx, 0, emptyRow);
    set({
      rows: newRows,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  removeRow: (rowIndex: number) => {
    const { columns, rows, undoStack } = get();
    const snapshot = takeSnapshot({ columns, rows });
    const newRows = rows.filter((_, i) => i !== rowIndex);
    set({
      rows: newRows,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  moveRow: (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const { columns, rows, undoStack } = get();
    const snapshot = takeSnapshot({ columns, rows });
    const newRows = [...rows];
    const [moved] = newRows.splice(fromIndex, 1);
    newRows.splice(toIndex, 0, moved);
    set({
      rows: newRows,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  addColumn: (column: Column, atIndex?: number) => {
    const { columns, rows, undoStack } = get();
    const snapshot = takeSnapshot({ columns, rows });
    const newColumns = [...columns];
    const idx = atIndex ?? newColumns.length;
    newColumns.splice(idx, 0, column);
    const newRows = rows.map((r) => ({ ...r, [column.field]: '' }));
    set({
      columns: newColumns,
      rows: newRows,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  moveColumn: (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const { columns, rows, undoStack } = get();
    const snapshot = takeSnapshot({ columns, rows });
    const newColumns = [...columns];
    const [moved] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, moved);
    set({
      columns: newColumns,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  reorderColumns: (fieldOrder: string[]) => {
    const { columns, rows, undoStack } = get();
    const colMap = new Map(columns.map((c) => [c.field, c]));
    const newColumns = fieldOrder
      .map((f) => colMap.get(f))
      .filter((c): c is Column => c != null);
    if (newColumns.length !== columns.length) return;
    const currentOrder = columns.map((c) => c.field);
    if (JSON.stringify(fieldOrder) === JSON.stringify(currentOrder)) return;
    const snapshot = takeSnapshot({ columns, rows });
    set({
      columns: newColumns,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  removeColumn: (field: string) => {
    const { columns, rows, undoStack } = get();
    const snapshot = takeSnapshot({ columns, rows });
    const newColumns = columns.filter((c) => c.field !== field);
    const newRows = rows.map((r) => {
      const copy = { ...r };
      delete copy[field];
      return copy;
    });
    set({
      columns: newColumns,
      rows: newRows,
      isDirty: true,
      undoStack: [...undoStack, snapshot].slice(-MAX_UNDO),
      redoStack: [],
    });
  },

  clearFile: () => {
    set({
      columns: [],
      rows: [],
      filePath: null,
      isDirty: false,
      undoStack: [],
      redoStack: [],
    });
  },

  save: async () => {
    const { filePath, columns, rows } = get();
    if (!filePath) return;
    set({ isSaving: true });
    try {
      await fileIpc.writeCsv(filePath, columns, rows);
      set({ isDirty: false, isSaving: false, lastSavedAt: new Date() });
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  undo: () => {
    const { undoStack, columns, rows } = get();
    if (undoStack.length === 0) return;
    const snapshot = takeSnapshot({ columns, rows });
    const prev = undoStack[undoStack.length - 1];
    set({
      columns: prev.columns,
      rows: prev.rows,
      isDirty: true,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, snapshot],
    });
  },

  redo: () => {
    const { redoStack, columns, rows } = get();
    if (redoStack.length === 0) return;
    const snapshot = takeSnapshot({ columns, rows });
    const next = redoStack[redoStack.length - 1];
    set({
      columns: next.columns,
      rows: next.rows,
      isDirty: true,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, snapshot],
    });
  },
}));
