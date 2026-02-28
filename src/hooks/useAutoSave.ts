import { useEffect, useRef } from 'react';
import { useSheetStore } from '../stores/useSheetStore';
import { useGitStore } from '../stores/useGitStore';

const AUTO_SAVE_DELAY_MS = 2000;

/**
 * Auto-save hook: watches isDirty, debounces for 2 seconds,
 * then saves the file to disk and refreshes git status.
 * Does NOT auto-commit — the user commits manually via the sidebar.
 */
export function useAutoSave(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = useSheetStore.subscribe((state) => {
      if (!state.isDirty || !state.filePath) return;

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        const { save, filePath } = useSheetStore.getState();
        if (!filePath) return;

        try {
          await save();
          // Refresh git status so the commit panel shows the changes
          await useGitStore.getState().fetchStatus();
        } catch {
          // Auto-save failures are silent; user can manually save.
        }
      }, AUTO_SAVE_DELAY_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
