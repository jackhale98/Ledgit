import React from 'react';

interface LegendItem {
  color: string;
  label: string;
}

const legendItems: LegendItem[] = [
  { color: '#dcfce7', label: 'Added' },
  { color: '#fee2e2', label: 'Removed' },
  { color: '#fef9c3', label: 'Modified' },
  { color: '#dbeafe', label: 'Column change' },
];

export const DiffLegend: React.FC = () => {
  return (
    <div className="flex items-center gap-3">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-gray-300"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
