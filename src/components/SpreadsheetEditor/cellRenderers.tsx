import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

interface DiffCellRendererProps extends ICellRendererParams {
  diffType?: 'added' | 'removed' | 'modified';
}

const bgColors: Record<string, string> = {
  added: '#dcfce7',
  removed: '#fee2e2',
  modified: '#fef9c3',
};

/**
 * Custom cell renderer that applies diff-aware background colors.
 */
export const DiffCellRenderer: React.FC<DiffCellRendererProps> = (props) => {
  const { value, diffType } = props;
  const bg = diffType ? bgColors[diffType] : undefined;

  return (
    <span
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        padding: '0 8px',
        lineHeight: '32px',
        backgroundColor: bg,
      }}
    >
      {value != null ? String(value) : ''}
    </span>
  );
};
