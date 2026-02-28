import React, { useState } from 'react';
import { useGitStore } from '../../stores/useGitStore';
import { useSheetStore } from '../../stores/useSheetStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { showToast } from '../common/Toast';

export const BranchSelector: React.FC = () => {
  const currentBranch = useGitStore((s) => s.currentBranch);
  const branches = useGitStore((s) => s.branches);
  const switchBranch = useGitStore((s) => s.switchBranch);
  const createBranch = useGitStore((s) => s.createBranch);
  const merge = useGitStore((s) => s.merge);
  const push = useGitStore((s) => s.push);
  const pull = useGitStore((s) => s.pull);
  const fetchBranches = useGitStore((s) => s.fetchBranches);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchLog = useGitStore((s) => s.fetchLog);

  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isMergeModalOpen, setMergeModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [mergeSource, setMergeSource] = useState('');

  const filePath = useSheetStore((s) => s.filePath);
  const loadFile = useSheetStore((s) => s.loadFile);
  const clearFile = useSheetStore((s) => s.clearFile);
  const sheetIsDirty = useSheetStore((s) => s.isDirty);
  const status = useGitStore((s) => s.status);

  const handleSwitch = async (branch: string) => {
    // Warn if there are uncommitted changes
    if (sheetIsDirty || (status && !status.clean)) {
      const confirmed = window.confirm(
        'You have uncommitted changes. Switching branches will discard them. Continue?',
      );
      if (!confirmed) return;
    }

    try {
      await switchBranch(branch);
      setDropdownOpen(false);
      showToast(`Switched to branch "${branch}"`, 'success');
      await fetchStatus();
      await fetchBranches();
      await fetchLog();

      // Reload the currently open file from the new branch
      if (filePath) {
        try {
          await loadFile(filePath);
        } catch {
          // File doesn't exist on the target branch
          clearFile();
          showToast('File does not exist on this branch', 'info');
        }
      }
    } catch (err) {
      showToast(`Failed to switch branch: ${err}`, 'error');
    }
  };

  const handleCreate = async () => {
    if (!newBranchName.trim()) return;
    try {
      await createBranch(newBranchName.trim());
      setNewBranchName('');
      setCreateModalOpen(false);
      showToast(`Created branch "${newBranchName.trim()}"`, 'success');
    } catch (err) {
      showToast(`Failed to create branch: ${err}`, 'error');
    }
  };

  const handleMerge = async () => {
    if (!mergeSource) return;
    try {
      const result = await merge(mergeSource);
      setMergeModalOpen(false);
      if (result.success) {
        showToast(`Merged "${mergeSource}" successfully`, 'success');
      } else {
        showToast(
          `Merge conflicts in: ${result.conflicts?.join(', ')}`,
          'error',
        );
      }
      fetchBranches();
      fetchStatus();
    } catch (err) {
      showToast(`Merge failed: ${err}`, 'error');
    }
  };

  const handlePush = async () => {
    try {
      await push();
      showToast('Pushed successfully', 'success');
    } catch (err) {
      showToast(`Push failed: ${err}`, 'error');
    }
  };

  const handlePull = async () => {
    try {
      const result = await pull();
      if (result.updated) {
        showToast(`Pulled ${result.new_commits} new commit(s)`, 'success');
      } else {
        showToast('Already up to date', 'info');
      }
      fetchStatus();
    } catch (err) {
      showToast(`Pull failed: ${err}`, 'error');
    }
  };

  return (
    <div className="border-b border-gray-200 p-3">
      {/* Branch dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!isDropdownOpen)}
          className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
            {branches.map((branch) => (
              <button
                key={branch}
                onClick={() => handleSwitch(branch)}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  branch === currentBranch
                    ? 'font-semibold text-blue-600'
                    : 'text-gray-700'
                }`}
              >
                {branch}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-2 flex gap-1">
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          title="New branch"
        >
          + Branch
        </button>
        <button
          onClick={() => {
            setMergeSource(branches.find((b) => b !== currentBranch) ?? '');
            setMergeModalOpen(true);
          }}
          className="flex-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          title="Merge"
        >
          Merge
        </button>
        <button
          onClick={handlePush}
          className="flex-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          title="Push"
        >
          Push
        </button>
        <button
          onClick={handlePull}
          className="flex-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          title="Pull"
        >
          Pull
        </button>
      </div>

      {/* Create Branch Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Branch"
      >
        <div className="space-y-4">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="Branch name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Merge Modal */}
      <Modal
        isOpen={isMergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="Merge Branch"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Merge into <strong>{currentBranch}</strong> from:
            </label>
            <select
              value={mergeSource}
              onChange={(e) => setMergeSource(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {branches
                .filter((b) => b !== currentBranch)
                .map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMergeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleMerge}>
              Merge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
