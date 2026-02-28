import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { Button } from '../common/Button';
import { showToast } from '../common/Toast';
import { ConflictCell } from './ConflictCell';
import * as gitIpc from '../../ipc/gitIpc';
import { useGitStore } from '../../stores/useGitStore';

interface MergeResolverProps {
  filePath: string;
  theirsCsv: string;
  oursCsv: string;
  mergedCsv: string;
  onResolved: () => void;
}

function parseCsvToRows(csv: string): string[][] {
  const result = Papa.parse<string[]>(csv.trim(), { header: false });
  return result.data;
}

export const MergeResolver: React.FC<MergeResolverProps> = ({
  filePath,
  theirsCsv,
  oursCsv,
  mergedCsv: initialMergedCsv,
  onResolved,
}) => {
  const commitChanges = useGitStore((s) => s.commitChanges);

  const theirsRows = useMemo(() => parseCsvToRows(theirsCsv), [theirsCsv]);
  const oursRows = useMemo(() => parseCsvToRows(oursCsv), [oursCsv]);
  const [mergedRows, setMergedRows] = useState(() => parseCsvToRows(initialMergedCsv));

  const headers = mergedRows.length > 0 ? mergedRows[0] : [];
  const maxRows = Math.max(theirsRows.length, oursRows.length, mergedRows.length);

  const handleAcceptTheirs = useCallback((rowIdx: number, colIdx: number) => {
    setMergedRows((prev) => {
      const updated = prev.map((row) => [...row]);
      if (updated[rowIdx] && theirsRows[rowIdx]) {
        updated[rowIdx][colIdx] = theirsRows[rowIdx][colIdx] ?? '';
      }
      return updated;
    });
  }, [theirsRows]);

  const handleAcceptOurs = useCallback((rowIdx: number, colIdx: number) => {
    setMergedRows((prev) => {
      const updated = prev.map((row) => [...row]);
      if (updated[rowIdx] && oursRows[rowIdx]) {
        updated[rowIdx][colIdx] = oursRows[rowIdx][colIdx] ?? '';
      }
      return updated;
    });
  }, [oursRows]);

  const handleAcceptAllTheirs = () => {
    setMergedRows(theirsRows.map((row) => [...row]));
  };

  const handleAcceptAllOurs = () => {
    setMergedRows(oursRows.map((row) => [...row]));
  };

  const handleEditMerged = (rowIdx: number, colIdx: number, value: string) => {
    setMergedRows((prev) => {
      const updated = prev.map((row) => [...row]);
      if (updated[rowIdx]) {
        updated[rowIdx][colIdx] = value;
      }
      return updated;
    });
  };

  const handleResolveAndCommit = async () => {
    try {
      const resolvedCsv = Papa.unparse(mergedRows);
      await gitIpc.resolveConflicts(filePath, resolvedCsv);
      const fileName = filePath.split('/').pop() ?? filePath;
      await commitChanges(`Resolve merge conflicts in ${fileName}`, [filePath]);
      showToast('Conflicts resolved and committed', 'success');
      onResolved();
    } catch (err) {
      showToast(`Failed to resolve: ${err}`, 'error');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-700">Merge Conflict Resolution</h3>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleAcceptAllTheirs}>
            Accept All Theirs
          </Button>
          <Button variant="secondary" onClick={handleAcceptAllOurs}>
            Accept All Ours
          </Button>
          <Button variant="primary" onClick={handleResolveAndCommit}>
            Resolve &amp; Commit
          </Button>
        </div>
      </div>

      {/* Three-pane view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Theirs pane */}
        <div className="flex flex-1 flex-col border-r border-gray-200">
          <div className="bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
            THEIRS
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="border-b bg-gray-50 px-2 py-1 text-left font-medium text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, rowIdx) => {
                  if (rowIdx === 0) return null; // skip header
                  const row = theirsRows[rowIdx] ?? [];
                  return (
                    <tr key={rowIdx}>
                      {headers.map((_, colIdx) => (
                        <td key={colIdx} className="border-b px-2 py-1 text-gray-700">
                          {row[colIdx] ?? ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Merged pane (editable) */}
        <div className="flex flex-1 flex-col border-r border-gray-200">
          <div className="bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700">
            MERGED (editable)
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="border-b bg-gray-50 px-2 py-1 text-left font-medium text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, rowIdx) => {
                  if (rowIdx === 0) return null; // skip header
                  const row = mergedRows[rowIdx] ?? [];
                  return (
                    <tr key={rowIdx}>
                      {headers.map((_, colIdx) => (
                        <ConflictCell
                          key={colIdx}
                          value={row[colIdx] ?? ''}
                          theirsValue={theirsRows[rowIdx]?.[colIdx] ?? ''}
                          oursValue={oursRows[rowIdx]?.[colIdx] ?? ''}
                          onChange={(val) => handleEditMerged(rowIdx, colIdx, val)}
                          onAcceptTheirs={() => handleAcceptTheirs(rowIdx, colIdx)}
                          onAcceptOurs={() => handleAcceptOurs(rowIdx, colIdx)}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ours pane */}
        <div className="flex flex-1 flex-col">
          <div className="bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            OURS
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="border-b bg-gray-50 px-2 py-1 text-left font-medium text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, rowIdx) => {
                  if (rowIdx === 0) return null; // skip header
                  const row = oursRows[rowIdx] ?? [];
                  return (
                    <tr key={rowIdx}>
                      {headers.map((_, colIdx) => (
                        <td key={colIdx} className="border-b px-2 py-1 text-gray-700">
                          {row[colIdx] ?? ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
