import { useEffect } from 'react';
import { useSheetStore } from '../stores/useSheetStore';

/**
 * Global keyboard shortcut handler.
 *   Ctrl+S  -> save
 *   Ctrl+Z  -> undo
 *   Ctrl+Y  -> redo
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 's') {
        e.preventDefault();
        useSheetStore.getState().save().catch(() => {});
      }

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        useSheetStore.getState().undo();
      }

      if (ctrl && e.key === 'y') {
        e.preventDefault();
        useSheetStore.getState().redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
