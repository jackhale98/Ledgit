import React, { useState } from 'react';
import { useGitStore } from '../../stores/useGitStore';
import { useSheetStore } from '../../stores/useSheetStore';
import { useDiffStore } from '../../stores/useDiffStore';
import * as gitIpc from '../../ipc/gitIpc';
import * as fileIpc from '../../ipc/fileIpc';
import { compareCsv } from '../../services/diffService';
import { showToast } from '../common/Toast';
import type { DiffResult } from '../../types/diff';

export const CommitPanel: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewDiff, setPreviewDiff] = useState<DiffResult | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  const status = useGitStore((s) => s.status);
  const commits = useGitStore((s) => s.commits);
  const commitChanges = useGitStore((s) => s.commitChanges);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchLog = useGitStore((s) => s.fetchLog);
  const isCompareMode = useDiffStore((s) => s.isCompareMode);
  const filePath = useSheetStore((s) => s.filePath);
  const save = useSheetStore((s) => s.save);
  const isDirty = useSheetStore((s) => s.isDirty);

  const changedFiles = [
    ...(status?.modified ?? []),
    ...(status?.staged ?? []),
    ...(status?.untracked ?? []),
  ];
  const uniqueFiles = [...new Set(changedFiles)];

  const handleFileClick = async (file: string) => {
    if (previewFile === file) {
      setPreviewFile(null);
      setPreviewDiff(null);
      return;
    }

    setPreviewFile(file);
    setIsLoadingDiff(true);
    setPreviewDiff(null);

    try {
      // Read current file from disk
      const sheetData = await fileIpc.readCsv(file);
      const currentRows = [
        sheetData.columns.map((c) => c.field),
        ...sheetData.rows.map((row) =>
          sheetData.columns.map((c) => {
            const v = row[c.field];
            return v == null ? '' : String(v);
          }),
        ),
      ];
      const currentCsv = currentRows.map((r) => r.join(',')).join('\n');

      // Get the last committed version (HEAD)
      let headCsv = '';
      const headCommit = commits[0];
      if (headCommit) {
        try {
          headCsv = await gitIpc.showFile(headCommit.hash, file);
        } catch {
          // File is new / untracked — no previous version
          headCsv = '';
        }
      }

      const result = compareCsv(headCsv || currentCsv.split('\n')[0], currentCsv);
      setPreviewDiff(result);
    } catch (err) {
      showToast(`Failed to load diff: ${err}`, 'error');
    }
    setIsLoadingDiff(false);
  };

  const handleCommit = async () => {
    if (!message.trim() || uniqueFiles.length === 0) return;

    setIsCommitting(true);
    try {
      if (isDirty) {
        await save();
      }
      await commitChanges(message.trim(), uniqueFiles);
      setMessage('');
      setPreviewFile(null);
      setPreviewDiff(null);
      showToast('Commit created', 'success');
      await fetchStatus();
      await fetchLog(filePath ?? undefined);
    } catch (err) {
      showToast(`Commit failed: ${err}`, 'error');
    }
    setIsCommitting(false);
  };

  if (isCompareMode) return null;

  return (
    <div className="border-b border-gray-200 p-3">
      {uniqueFiles.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-medium text-gray-500">
            {uniqueFiles.length} changed file{uniqueFiles.length !== 1 ? 's' : ''}
          </p>
          <div className="max-h-24 overflow-y-auto">
            {uniqueFiles.map((f) => (
              <button
                key={f}
                onClick={() => handleFileClick(f)}
                className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition-colors ${
                  previewFile === f
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{f}</span>
                {status?.untracked.includes(f) && (
                  <span className="shrink-0 rounded bg-green-100 px-1 text-green-700">new</span>
                )}
                {status?.modified.includes(f) && (
                  <span className="shrink-0 rounded bg-yellow-100 px-1 text-yellow-700">mod</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Working tree diff preview */}
      {previewFile && (
        <div className="mb-2 max-h-48 overflow-auto rounded border border-gray-200 bg-gray-50 text-xs">
          {isLoadingDiff && (
            <p className="p-2 text-gray-400">Loading diff...</p>
          )}
          {!isLoadingDiff && previewDiff && (
            <div>
              <div className="border-b border-gray-200 bg-white px-2 py-1 font-medium text-gray-600">
                {previewDiff.summary}
              </div>
              <div
                className="daff-diff-table p-1"
                dangerouslySetInnerHTML={{ __html: previewDiff.htmlDiff }}
              />
            </div>
          )}
          {!isLoadingDiff && !previewDiff && (
            <p className="p-2 text-gray-400">No diff available</p>
          )}
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
