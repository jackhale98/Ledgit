import { useMemo } from 'react';
import { useDiffStore } from '../stores/useDiffStore';
import type { CellClassParams } from 'ag-grid-community';

const ADDED_BG = '#dcfce7';
const REMOVED_BG = '#fee2e2';
const MODIFIED_BG = '#fef9c3';

/**
 * Returns an AG Grid cellStyle callback that colors cells
 * based on diff data (added/removed/modified).
 */
export function useDiffHighlighting() {
  const diffResult = useDiffStore((s) => s.diffResult);
  const isCompareMode = useDiffStore((s) => s.isCompareMode);

  const cellStyleFn = useMemo(() => {
    if (!isCompareMode || !diffResult) {
      return undefined;
    }

    const { structuredDiff } = diffResult;
    const addedSet = new Set(structuredDiff.addedRows);
    const removedSet = new Set(structuredDiff.removedRows);

    // Build a lookup for modified cells: "row:col" -> true
    const modifiedLookup = new Set<string>();
    for (const mc of structuredDiff.modifiedCells) {
      modifiedLookup.add(`${mc.row}:${mc.col}`);
    }

    return (params: CellClassParams): Record<string, string> | undefined => {
      const rowIndex = params.node?.rowIndex;
      if (rowIndex == null) return undefined;

      if (addedSet.has(rowIndex)) {
        return { backgroundColor: ADDED_BG };
      }
      if (removedSet.has(rowIndex)) {
        return { backgroundColor: REMOVED_BG };
      }

      const field = params.colDef?.field;
      if (field && modifiedLookup.has(`${rowIndex}:${field}`)) {
        return { backgroundColor: MODIFIED_BG };
      }

      return undefined;
    };
  }, [isCompareMode, diffResult]);

  return cellStyleFn;
}
