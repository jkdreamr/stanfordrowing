import { getInitials } from '@/lib/data';

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
  /** Show a ring indicating recent activity (used in stories) */
  ring?: boolean;
  /** Uploaded profile photo; falls back to initials when absent. */
  src?: string | null;
}

// Deterministic warm/stone gradient per rower so avatars feel distinct but on-brand.
const GRADIENTS = [
  'linear-gradient(145deg, #2b3531 0%, #161c1a 100%)',
  'linear-gradient(145deg, #33302a 0%, #1a1714 100%)',
  'linear-gradient(145deg, #2a3330 0%, #14201c 100%)',
  'linear-gradient(145deg, #352a2b 0%, #1d1517 100%)',
  'linear-gradient(145deg, #2e322a 0%, #181a14 100%)',
];

function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export default function Avatar({ name, color, size = 40, className = '', ring = false, src }: AvatarProps) {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.36);
  const ringShadow = ring ? `0 0 0 2px #0d1110, 0 0 0 4px ${color || '#c8202b'}` : 'none';

  if (src) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-white/10 ${className}`}
        style={{ width: size, height: size, boxShadow: ringShadow }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-charcoal/90 ring-1 ring-inset ring-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        letterSpacing: '0.02em',
        backgroundImage: gradientFor(name),
        boxShadow: ringShadow,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
