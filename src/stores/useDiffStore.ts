import { create } from 'zustand';
import type { DiffResult } from '../types/diff';
import * as gitIpc from '../ipc/gitIpc';
import { compareCsv } from '../services/diffService';
import { showToast } from '../components/common/Toast';

interface DiffState {
  isCompareMode: boolean;
  fromCommit: string | null;
  toCommit: string | null;
  diffResult: DiffResult | null;
  isLoading: boolean;

  toggleCompareMode: () => void;
  selectCommit: (hash: string) => void;
  computeDiff: (filePath: string) => Promise<void>;
  clearDiff: () => void;
}

export const useDiffStore = create<DiffState>((set, get) => ({
  isCompareMode: false,
  fromCommit: null,
  toCommit: null,
  diffResult: null,
  isLoading: false,

  toggleCompareMode: () => {
    const { isCompareMode } = get();
    if (isCompareMode) {
      set({
        isCompareMode: false,
        fromCommit: null,
        toCommit: null,
        diffResult: null,
      });
    } else {
      set({ isCompareMode: true });
    }
  },

  selectCommit: (hash: string) => {
    const { fromCommit } = get();
    if (fromCommit === null) {
      set({ fromCommit: hash, toCommit: null, diffResult: null });
    } else {
      set({ toCommit: hash });
    }
  },

  computeDiff: async (filePath: string) => {
    const { fromCommit, toCommit } = get();
    if (!fromCommit || !toCommit) return;

    set({ isLoading: true });
    try {
      const [csvA, csvB] = await Promise.all([
        gitIpc.showFile(fromCommit, filePath),
        gitIpc.showFile(toCommit, filePath),
      ]);
      const result = compareCsv(csvA, csvB);
      set({ diffResult: result, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      showToast(`Diff failed: ${err}`, 'error');
    }
  },

  clearDiff: () => {
    set({
      fromCommit: null,
      toCommit: null,
      diffResult: null,
    });
  },
}));
