'use client';

import { useState } from 'react';
import Icon from './Icon';

interface RespectButtonProps {
  count: number;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void | Promise<void>;
  showLabel?: boolean;
  /** Show the numeric count next to the heart. Off when a face-pile owns the count. */
  showCount?: boolean;
  className?: string;
}

export default function RespectButton({
  count,
  active,
  disabled = false,
  onToggle,
  showLabel = true,
  showCount = true,
  className = '',
}: RespectButtonProps) {
  const [popping, setPopping] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    if (!active) {
      setPopping(true);
      window.setTimeout(() => setPopping(false), 400);
    }
    void onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? 'Remove respect' : 'Respect'}
      title={disabled ? 'Your own work speaks for itself' : undefined}
      className={`group inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg transition-all duration-150 active:scale-90 touch-manipulation ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      } ${className}`}
    >
      <Icon
        name="favorite"
        fill={active}
        size={18}
        className={`${popping ? 'animate-respect-pop' : ''} ${
          active ? 'text-coral' : 'text-charcoal-light group-hover:text-coral'
        } transition-colors`}
      />
      {((showCount && count > 0) || showLabel) && (
        <span className="text-[11px] font-medium tabular text-charcoal-muted">
          {showCount && count > 0 && count}
          {showCount && count > 0 && showLabel && ' '}
          {showLabel && 'Respect'}
        </span>
      )}
    </button>
  );
}
