import { getInitials } from '@/lib/data';

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
  /** Show a ring indicating recent activity (used in stories) */
  ring?: boolean;
}

export default function Avatar({ name, color, size = 40, className = '', ring = false }: AvatarProps) {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.36);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-stone-light font-medium text-charcoal-soft ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        letterSpacing: '0.02em',
        boxShadow: ring
          ? `0 0 0 2px #f5f2ed, 0 0 0 4px ${color || '#c4704a'}`
          : 'none',
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
