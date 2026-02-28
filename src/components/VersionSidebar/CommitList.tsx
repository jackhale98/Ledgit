import React from 'react';
import { useGitStore } from '../../stores/useGitStore';
import { useDiffStore } from '../../stores/useDiffStore';
import { formatRelativeTime } from '../../utils/formatters';

export const CommitList: React.FC = () => {
  const commits = useGitStore((s) => s.commits);
  const isLoading = useGitStore((s) => s.isLoading);
  const isCompareMode = useDiffStore((s) => s.isCompareMode);
  const fromCommit = useDiffStore((s) => s.fromCommit);
  const toCommit = useDiffStore((s) => s.toCommit);
  const selectCommit = useDiffStore((s) => s.selectCommit);
  const toggleCompareMode = useDiffStore((s) => s.toggleCompareMode);

  const handleCommitClick = (hash: string) => {
    if (isCompareMode) {
      selectCommit(hash);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Compare mode toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">Commits</span>
        <button
          onClick={toggleCompareMode}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            isCompareMode
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {isCompareMode ? 'Exit Compare' : 'Compare'}
        </button>
      </div>

      {/* Compare mode instructions */}
      {isCompareMode && !fromCommit && (
        <div className="bg-blue-50 px-3 py-2 text-xs text-blue-600">
          Click a commit to select the starting point
        </div>
      )}
      {isCompareMode && fromCommit && !toCommit && (
        <div className="bg-blue-50 px-3 py-2 text-xs text-blue-600">
          Now click a second commit to compare
        </div>
      )}

      {/* Commit list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-3 text-center text-sm text-gray-400">Loading...</div>
        )}
        {!isLoading && commits.length === 0 && (
          <div className="p-3 text-center text-sm text-gray-400">
            No commits yet
          </div>
        )}
        {commits.map((commit) => {
          const isFrom = fromCommit === commit.hash;
          const isTo = toCommit === commit.hash;
          const isSelected = isFrom || isTo;

          return (
            <button
              key={commit.hash}
              onClick={() => handleCommitClick(commit.hash)}
              className={`w-full border-b border-gray-100 px-3 py-2 text-left transition-colors ${
                isSelected
                  ? 'bg-blue-50'
                  : isCompareMode
                    ? 'hover:bg-gray-50 cursor-pointer'
                    : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                  {commit.short_hash}
                </span>
                {isFrom && (
                  <span className="rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">
                    FROM
                  </span>
                )}
                {isTo && (
                  <span className="rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">
                    TO
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-gray-800">
                {commit.message}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {commit.author} &middot; {formatRelativeTime(commit.timestamp)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
