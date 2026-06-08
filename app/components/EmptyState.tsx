import Link from 'next/link';
import { ReactNode } from 'react';
import Icon from './Icon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon = 'rowing',
  title,
  message,
  actionLabel,
  actionHref,
  children,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`panel-cinematic px-6 py-14 text-center ${className}`}>
      {/* faint waterline texture */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-30"
        style={{
          background:
            'repeating-linear-gradient(90deg, transparent 0 18px, rgba(255,255,255,0.04) 18px 19px)',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
        }}
      />
      <div className="relative flex flex-col items-center">
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-charcoal-soft">
          <Icon name={icon} size={30} />
        </span>
        <h3 className="font-display text-lg font-semibold tracking-editorial text-charcoal">{title}</h3>
        {message && <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-charcoal-muted">{message}</p>}
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="focus-ring mt-6 rounded-pill bg-coral px-6 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-colors hover:bg-coral-dark active:scale-95"
          >
            {actionLabel}
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
