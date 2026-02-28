import { useEffect, useRef } from 'react';
import { useSheetStore } from '../stores/useSheetStore';
import { useGitStore } from '../stores/useGitStore';
import { generateCommitMessage } from '../utils/csvHelpers';

const AUTO_SAVE_DELAY_MS = 2000;

/**
 * Auto-save hook: watches isDirty, debounces for 2 seconds,
 * then calls save() and creates a git commit.
 */
export function useAutoSave(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevColumnsRef = useRef(useSheetStore.getState().columns);
  const prevRowsRef = useRef(useSheetStore.getState().rows);

  useEffect(() => {
    const unsubscribe = useSheetStore.subscribe((state) => {
      if (!state.isDirty || !state.filePath) return;

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        const { save, filePath, columns, rows } = useSheetStore.getState();
        if (!filePath) return;

        try {
          await save();

          const message = generateCommitMessage(
            filePath,
            prevColumnsRef.current,
            columns,
            prevRowsRef.current,
            rows,
          );

          await useGitStore.getState().commitChanges(message, [filePath]);

          // Update refs for next comparison
          prevColumnsRef.current = columns;
          prevRowsRef.current = rows;
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
