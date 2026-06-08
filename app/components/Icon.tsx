import { CSSProperties } from 'react';

interface IconProps {
  name: string;
  className?: string;
  fill?: boolean;
  size?: number;
  title?: string;
}

/** Material Symbols (Outlined) icon. Loaded via the font link in layout.tsx. */
export default function Icon({ name, className = '', fill = false, size, title }: IconProps) {
  const style: CSSProperties | undefined = size ? { fontSize: `${size}px` } : undefined;
  return (
    <span
      className={`material-symbols-outlined${fill ? ' fill' : ''} ${className}`}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {name}
    </span>
  );
}
