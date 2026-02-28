import React, { useEffect } from 'react';
import { useDiffStore } from '../../stores/useDiffStore';
import { useSheetStore } from '../../stores/useSheetStore';
import { RedlineGrid } from './RedlineGrid';
import { DiffLegend } from './DiffLegend';

export const DiffViewer: React.FC = () => {
  const isCompareMode = useDiffStore((s) => s.isCompareMode);
  const fromCommit = useDiffStore((s) => s.fromCommit);
  const toCommit = useDiffStore((s) => s.toCommit);
  const diffResult = useDiffStore((s) => s.diffResult);
  const isLoading = useDiffStore((s) => s.isLoading);
  const computeDiff = useDiffStore((s) => s.computeDiff);
  const clearDiff = useDiffStore((s) => s.clearDiff);
  const filePath = useSheetStore((s) => s.filePath);

  // Trigger diff computation when both commits are selected
  useEffect(() => {
    if (fromCommit && toCommit && filePath) {
      computeDiff(filePath);
    }
  }, [fromCommit, toCommit, filePath, computeDiff]);

  if (!isCompareMode) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-700">Diff View</h3>
          {diffResult && (
            <span className="text-sm text-gray-500">{diffResult.summary}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DiffLegend />
          <button
            onClick={clearDiff}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            Computing diff...
          </div>
        )}

        {!isLoading && !diffResult && fromCommit && !toCommit && (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select a second commit to compare
          </div>
        )}

        {!isLoading && !diffResult && !fromCommit && (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select two commits from the sidebar to compare
          </div>
        )}

        {!isLoading && diffResult && <RedlineGrid diffResult={diffResult} />}
      </div>
    </div>
  );
};
