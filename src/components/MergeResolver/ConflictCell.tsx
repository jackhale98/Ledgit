import React, { useState } from 'react';

interface ConflictCellProps {
  value: string;
  theirsValue: string;
  oursValue: string;
  onChange: (value: string) => void;
  onAcceptTheirs: () => void;
  onAcceptOurs: () => void;
}

/**
 * An editable cell in the merged pane of the merge resolver.
 * Highlights conflicts and allows the user to accept a value
 * from either side by clicking.
 */
export const ConflictCell: React.FC<ConflictCellProps> = ({
  value,
  theirsValue,
  oursValue,
  onChange,
  onAcceptTheirs,
  onAcceptOurs,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const hasConflict = theirsValue !== oursValue;
  const isResolved = value === theirsValue || value === oursValue;

  const bgColor = hasConflict
    ? isResolved
      ? 'bg-green-50'
      : 'bg-yellow-50'
    : '';

  if (isEditing) {
    return (
      <td className={`border-b px-0 py-0 ${bgColor}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditing(false);
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="w-full border-0 bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          autoFocus
        />
      </td>
    );
  }

  return (
    <td className={`group relative border-b px-2 py-1 text-sm text-gray-700 ${bgColor}`}>
      <span
        className="cursor-text"
        onClick={() => setIsEditing(true)}
      >
        {value || '\u00A0'}
      </span>

      {/* Quick-accept buttons, shown on hover for conflict cells */}
      {hasConflict && !isEditing && (
        <span className="absolute right-0 top-0 hidden gap-0.5 group-hover:flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcceptTheirs();
            }}
            className="rounded bg-red-100 px-1 text-xs text-red-700 hover:bg-red-200"
            title="Accept theirs"
          >
            T
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcceptOurs();
            }}
            className="rounded bg-green-100 px-1 text-xs text-green-700 hover:bg-green-200"
            title="Accept ours"
          >
            O
          </button>
        </span>
      )}
    </td>
  );
};
