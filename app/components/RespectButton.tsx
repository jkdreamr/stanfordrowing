'use client';

import { useState } from 'react';
import Icon from './Icon';

interface RespectButtonProps {
  count: number;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void | Promise<void>;
  /** show the word "Respect" next to the count */
  showLabel?: boolean;
  className?: string;
}

/**
 * Heart / "Respect" reaction button with optimistic press animation.
 * The parent owns the count + active state (optimistic updates live there).
 */
export default function RespectButton({
  count,
  active,
  disabled = false,
  onToggle,
  showLabel = true,
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
      aria-label={active ? 'Remove respect' : 'Give respect'}
      title={disabled ? 'You can’t respect your own work' : undefined}
      className={`group inline-flex items-center gap-1.5 transition-transform duration-150 active:scale-90 ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
    >
      <Icon
        name="favorite"
        fill={active}
        size={22}
        className={`${popping ? 'animate-respect-pop' : ''} ${
          active ? 'text-cardinal' : 'text-ink-soft group-hover:text-cardinal'
        } transition-colors`}
      />
      <span className="label-caps tabular text-ink-soft">
        {count}
        {showLabel ? ' Respect' : ''}
      </span>
    </button>
  );
}
