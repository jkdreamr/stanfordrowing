import { getInitials } from '@/lib/data';

interface AvatarProps {
  name: string;
  color?: string; // team color for the ring/accent
  size?: number; // px
  className?: string;
}

/**
 * Initials avatar with a subtle team-colored ring. We don't have rower photos,
 * so clean monogram chips keep the feed premium and consistent (no stock art).
 */
export default function Avatar({ name, color = '#b51c00', size = 40, className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.36);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-container-low font-semibold text-ink ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        boxShadow: `inset 0 0 0 2px ${color}33`,
        letterSpacing: '0.02em',
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
