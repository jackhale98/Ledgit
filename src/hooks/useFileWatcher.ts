import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useSheetStore } from '../stores/useSheetStore';

interface FileChangedPayload {
  path: string;
}

/**
 * Listens for Tauri 'file-changed' events and triggers reload
 * when the currently open file is modified externally.
 */
export function useFileWatcher(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<FileChangedPayload>('file-changed', (event) => {
      const { filePath, loadFile, isDirty } = useSheetStore.getState();

      // Only reload if the changed file matches the currently open file
      // and there are no unsaved local changes.
      if (
        filePath &&
        event.payload.path === filePath &&
        !isDirty
      ) {
        loadFile(filePath).catch(() => {});
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
}
