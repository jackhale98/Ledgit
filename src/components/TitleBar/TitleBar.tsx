import React from 'react';
import { useRepoStore } from '../../stores/useRepoStore';
import { useSheetStore } from '../../stores/useSheetStore';
import { useGitStore } from '../../stores/useGitStore';

export const TitleBar: React.FC = () => {
  const repoInfo = useRepoStore((s) => s.repoInfo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const filePath = useSheetStore((s) => s.filePath);
  const isDirty = useSheetStore((s) => s.isDirty);
  const isSaving = useSheetStore((s) => s.isSaving);
  const lastSavedAt = useSheetStore((s) => s.lastSavedAt);
  const currentBranch = useGitStore((s) => s.currentBranch);

  const fileName = filePath ? filePath.split('/').pop() : null;
  const repoName = repoInfo?.name ?? 'Ledgit';

  const saveStatus = isSaving
    ? 'Saving...'
    : isDirty
      ? 'Unsaved changes'
      : lastSavedAt
        ? `Saved at ${lastSavedAt.toLocaleTimeString()}`
        : '';

  return (
    <div className="flex h-10 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: repo name and file name */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-900">{repoName}</span>
        {fileName && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">
              {fileName}
              {isDirty && <span className="ml-1 text-orange-500">*</span>}
            </span>
          </>
        )}
      </div>

      {/* Center: save status */}
      <div className="text-xs text-gray-400">{saveStatus}</div>

      {/* Right: branch and close */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          {currentBranch}
        </span>
        <button
          onClick={closeRepo}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Close repository"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
