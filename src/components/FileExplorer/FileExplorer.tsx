import React, { useEffect, useState, useCallback } from 'react';
import type { FileInfo } from '../../types/sheet';
import * as fileIpc from '../../ipc/fileIpc';
import { useSheetStore } from '../../stores/useSheetStore';
import { formatFileSize } from '../../utils/csvHelpers';
import { showToast } from '../common/Toast';

export const FileExplorer: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const filePath = useSheetStore((s) => s.filePath);
  const loadFile = useSheetStore((s) => s.loadFile);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fileIpc.list();
      setFiles(result);
    } catch {
      // Silent fail - files may not be listed yet
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileClick = async (file: FileInfo) => {
    try {
      await loadFile(file.path);
    } catch (err) {
      showToast(`Failed to open file: ${err}`, 'error');
    }
  };

  const handleCreateFile = async () => {
    const name = prompt('Enter file name (e.g., data.csv):');
    if (!name) return;

    const colInput = prompt('Enter column names (comma-separated):');
    if (!colInput) return;

    const columns = colInput.split(',').map((c) => {
      const trimmed = c.trim();
      return {
        field: trimmed.toLowerCase().replace(/\s+/g, '_'),
        header_name: trimmed,
      };
    });

    try {
      await fileIpc.create(name, columns);
      await fetchFiles();
      showToast(`Created ${name}`, 'success');
    } catch (err) {
      showToast(`Failed to create file: ${err}`, 'error');
    }
  };

  const handleDeleteFile = async (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(`Delete "${file.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await fileIpc.deleteCsv(file.path);
      await fetchFiles();
      showToast(`Deleted ${file.name}`, 'success');
    } catch (err) {
      showToast(`Failed to delete file: ${err}`, 'error');
    }
  };

  return (
    <div className="flex h-full w-52 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Files
        </h2>
        <button
          onClick={handleCreateFile}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="New CSV file"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-3 text-center text-sm text-gray-400">Loading...</div>
        )}
        {!isLoading && files.length === 0 && (
          <div className="p-3 text-center text-sm text-gray-400">
            No CSV files found
          </div>
        )}
        {files.map((file) => {
          const isActive = filePath === file.path;
          return (
            <button
              key={file.path}
              onClick={() => handleFileClick(file)}
              className={`group flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.size_bytes)}
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteFile(file, e)}
                className="ml-2 hidden rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-600 group-hover:block"
                title="Delete file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
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
            </button>
          );
        })}
      </div>

      {/* Refresh button */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={fetchFiles}
          className="w-full rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};
