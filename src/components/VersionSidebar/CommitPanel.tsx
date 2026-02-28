import React, { useState } from 'react';
import { useGitStore } from '../../stores/useGitStore';
import { useSheetStore } from '../../stores/useSheetStore';
import { showToast } from '../common/Toast';

export const CommitPanel: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  const status = useGitStore((s) => s.status);
  const commitChanges = useGitStore((s) => s.commitChanges);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchLog = useGitStore((s) => s.fetchLog);
  const filePath = useSheetStore((s) => s.filePath);
  const save = useSheetStore((s) => s.save);
  const isDirty = useSheetStore((s) => s.isDirty);

  const changedFiles = [
    ...(status?.modified ?? []),
    ...(status?.staged ?? []),
    ...(status?.untracked ?? []),
  ];
  // Deduplicate
  const uniqueFiles = [...new Set(changedFiles)];

  const handleCommit = async () => {
    if (!message.trim() || uniqueFiles.length === 0) return;

    setIsCommitting(true);
    try {
      // Save unsaved changes first
      if (isDirty) {
        await save();
      }
      await commitChanges(message.trim(), uniqueFiles);
      setMessage('');
      showToast('Commit created', 'success');
      await fetchStatus();
      await fetchLog(filePath ?? undefined);
    } catch (err) {
      showToast(`Commit failed: ${err}`, 'error');
    }
    setIsCommitting(false);
  };

  return (
    <div className="border-b border-gray-200 p-3">
      {uniqueFiles.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-medium text-gray-500">
            {uniqueFiles.length} changed file{uniqueFiles.length !== 1 ? 's' : ''}
          </p>
          <div className="max-h-20 overflow-y-auto">
            {uniqueFiles.map((f) => (
              <p key={f} className="truncate text-xs text-gray-600">{f}</p>
            ))}
          </div>
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message…"
        rows={2}
        className="w-full resize-none rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
      />
      <button
        onClick={handleCommit}
        disabled={!message.trim() || uniqueFiles.length === 0 || isCommitting}
        className="mt-1.5 w-full rounded bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCommitting ? 'Committing…' : 'Commit'}
      </button>
    </div>
  );
};
