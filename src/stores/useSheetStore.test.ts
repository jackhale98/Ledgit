import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSheetStore } from './useSheetStore';

// Mock the Tauri IPC layer
vi.mock('../ipc/fileIpc', () => ({
  readCsv: vi.fn(),
  writeCsv: vi.fn(),
}));

import * as fileIpc from '../ipc/fileIpc';

const mockedReadCsv = vi.mocked(fileIpc.readCsv);
const mockedWriteCsv = vi.mocked(fileIpc.writeCsv);

beforeEach(() => {
  // Reset store to initial state
  useSheetStore.setState({
    columns: [],
    rows: [],
    filePath: null,
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    undoStack: [],
    redoStack: [],
  });
  vi.clearAllMocks();
});

describe('useSheetStore', () => {
  describe('loadFile', () => {
    it('loads columns and rows from IPC and resets dirty state', async () => {
      mockedReadCsv.mockResolvedValue({
        columns: [
          { field: 'name', header_name: 'Name', col_type: 'text' },
          { field: 'age', header_name: 'Age', col_type: 'number' },
        ],
        rows: [{ name: 'Alice', age: 30 }],
        meta: { file_path: 'test.csv', row_count: 1, delimiter: ',', size_bytes: 20 },
      });

      await useSheetStore.getState().loadFile('test.csv');

      const state = useSheetStore.getState();
      expect(state.filePath).toBe('test.csv');
      expect(state.columns).toHaveLength(2);
      expect(state.rows).toHaveLength(1);
      expect(state.isDirty).toBe(false);
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(0);
    });
  });

  describe('clearFile', () => {
    it('resets all state to empty', async () => {
      // Set some state first
      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: 'val' }],
        filePath: 'test.csv',
        isDirty: true,
        undoStack: [{ columns: [], rows: [] }],
        redoStack: [{ columns: [], rows: [] }],
      });

      useSheetStore.getState().clearFile();

      const state = useSheetStore.getState();
      expect(state.columns).toHaveLength(0);
      expect(state.rows).toHaveLength(0);
      expect(state.filePath).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(0);
    });
  });

  describe('updateCell', () => {
    it('updates a cell value and marks dirty', () => {
      useSheetStore.setState({
        columns: [{ field: 'name', header_name: 'Name', col_type: 'text' }],
        rows: [{ name: 'Alice' }, { name: 'Bob' }],
      });

      useSheetStore.getState().updateCell(0, 'name', 'Carol');

      const state = useSheetStore.getState();
      expect(state.rows[0].name).toBe('Carol');
      expect(state.rows[1].name).toBe('Bob');
      expect(state.isDirty).toBe(true);
      expect(state.undoStack).toHaveLength(1);
    });
  });

  describe('addRow', () => {
    it('adds an empty row at the end by default', () => {
      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: '1' }],
      });

      useSheetStore.getState().addRow();

      const state = useSheetStore.getState();
      expect(state.rows).toHaveLength(2);
      expect(state.rows[1].a).toBe('');
      expect(state.isDirty).toBe(true);
    });

    it('inserts a row at a specific index', () => {
      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: '1' }, { a: '2' }],
      });

      useSheetStore.getState().addRow(1);

      const state = useSheetStore.getState();
      expect(state.rows).toHaveLength(3);
      expect(state.rows[0].a).toBe('1');
      expect(state.rows[1].a).toBe('');
      expect(state.rows[2].a).toBe('2');
    });
  });

  describe('removeRow', () => {
    it('removes a row by index', () => {
      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: '1' }, { a: '2' }, { a: '3' }],
      });

      useSheetStore.getState().removeRow(1);

      const state = useSheetStore.getState();
      expect(state.rows).toHaveLength(2);
      expect(state.rows[0].a).toBe('1');
      expect(state.rows[1].a).toBe('3');
    });
  });

  describe('addColumn', () => {
    it('adds a column and populates all rows with empty values', () => {
      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: '1' }, { a: '2' }],
      });

      useSheetStore.getState().addColumn({ field: 'b', header_name: 'B', col_type: 'text' });

      const state = useSheetStore.getState();
      expect(state.columns).toHaveLength(2);
      expect(state.rows[0].b).toBe('');
      expect(state.rows[1].b).toBe('');
    });
  });

  describe('removeColumn', () => {
    it('removes a column and its data from all rows', () => {
      useSheetStore.setState({
        columns: [
          { field: 'a', header_name: 'A', col_type: 'text' },
          { field: 'b', header_name: 'B', col_type: 'text' },
        ],
        rows: [{ a: '1', b: '2' }],
      });

      useSheetStore.getState().removeColumn('b');

      const state = useSheetStore.getState();
      expect(state.columns).toHaveLength(1);
      expect(state.rows[0].b).toBeUndefined();
    });
  });

  describe('undo/redo', () => {
    it('undoes the last change and allows redo', () => {
      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: 'original' }],
      });

      useSheetStore.getState().updateCell(0, 'a', 'changed');
      expect(useSheetStore.getState().rows[0].a).toBe('changed');

      useSheetStore.getState().undo();
      expect(useSheetStore.getState().rows[0].a).toBe('original');

      useSheetStore.getState().redo();
      expect(useSheetStore.getState().rows[0].a).toBe('changed');
    });

    it('undo does nothing when stack is empty', () => {
      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: 'val' }],
        undoStack: [],
      });

      useSheetStore.getState().undo();
      expect(useSheetStore.getState().rows[0].a).toBe('val');
    });
  });

  describe('save', () => {
    it('calls writeCsv and clears dirty state', async () => {
      mockedWriteCsv.mockResolvedValue({ bytesWritten: 10 });

      useSheetStore.setState({
        columns: [{ field: 'a', header_name: 'A', col_type: 'text' }],
        rows: [{ a: '1' }],
        filePath: 'test.csv',
        isDirty: true,
      });

      await useSheetStore.getState().save();

      const state = useSheetStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).not.toBeNull();
      expect(mockedWriteCsv).toHaveBeenCalledWith(
        'test.csv',
        [{ field: 'a', header_name: 'A', col_type: 'text' }],
        [{ a: '1' }],
      );
    });

    it('does nothing if filePath is null', async () => {
      useSheetStore.setState({ filePath: null });

      await useSheetStore.getState().save();

      expect(mockedWriteCsv).not.toHaveBeenCalled();
    });
  });
});
