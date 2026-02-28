import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGridConfig } from './useGridConfig';
import type { Column } from '../../types/sheet';

describe('useGridConfig', () => {
  const columns: Column[] = [
    { field: 'name', header_name: 'Name', col_type: 'text' },
    { field: 'salary', header_name: 'Salary', col_type: 'number' },
  ];

  it('generates columnDefs from columns', () => {
    const { result } = renderHook(() => useGridConfig(columns));

    // +1 for drag handle column at index 0
    expect(result.current.columnDefs).toHaveLength(3);
    expect(result.current.columnDefs[0].rowDrag).toBe(true);
    expect(result.current.columnDefs[1].field).toBe('name');
    expect(result.current.columnDefs[1].headerName).toBe('Name');
    expect(result.current.columnDefs[2].field).toBe('salary');
  });

  it('sets data columns as editable, sortable, filterable, and resizable', () => {
    const { result } = renderHook(() => useGridConfig(columns));

    // Skip index 0 (drag handle column)
    const dataCols = result.current.columnDefs.slice(1);
    for (const col of dataCols) {
      expect(col.editable).toBe(true);
      expect(col.sortable).toBe(true);
      expect(col.filter).toBe(true);
      expect(col.resizable).toBe(true);
    }
  });

  it('has correct defaultColDef settings', () => {
    const { result } = renderHook(() => useGridConfig(columns));

    const defaults = result.current.defaultColDef;
    expect(defaults.filter).toBe('agTextColumnFilter');
    expect(defaults.floatingFilter).toBe(false);
    expect(defaults.editable).toBe(true);
    expect(defaults.sortable).toBe(true);
    expect(defaults.resizable).toBe(true);
    expect(defaults.minWidth).toBe(120);
  });

  it('includes reset and apply buttons in filter params', () => {
    const { result } = renderHook(() => useGridConfig(columns));

    const params = result.current.defaultColDef.filterParams as { buttons: string[] };
    expect(params.buttons).toContain('reset');
    expect(params.buttons).toContain('apply');
  });

  it('returns only drag handle column for empty columns input', () => {
    const { result } = renderHook(() => useGridConfig([]));

    // Only the drag handle column
    expect(result.current.columnDefs).toHaveLength(1);
    expect(result.current.columnDefs[0].rowDrag).toBe(true);
  });
});
