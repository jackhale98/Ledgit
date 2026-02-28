import React, { useEffect } from 'react';
import { useGitStore } from '../../stores/useGitStore';
import { useSheetStore } from '../../stores/useSheetStore';
import { BranchSelector } from './BranchSelector';
import { CommitPanel } from './CommitPanel';
import { CommitList } from './CommitList';

export const VersionSidebar: React.FC = () => {
  const fetchLog = useGitStore((s) => s.fetchLog);
  const fetchBranches = useGitStore((s) => s.fetchBranches);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const filePath = useSheetStore((s) => s.filePath);

  useEffect(() => {
    fetchBranches();
    fetchStatus();
    fetchLog(filePath ?? undefined);
  }, [fetchBranches, fetchStatus, fetchLog, filePath]);

  return (
    <div className="flex h-full w-64 flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Version Control
        </h2>
      </div>
      <BranchSelector />
      <CommitPanel />
      <CommitList />
    </div>
  );
};
