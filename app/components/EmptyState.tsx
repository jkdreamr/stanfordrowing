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

/** Polished, on-brand empty state with optional CTA. */
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
    <div
      className={`card flex flex-col items-center rounded-2xl px-6 py-12 text-center ${className}`}
    >
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-container-low">
        <Icon name={icon} className="text-ink-muted" size={30} />
      </span>
      <h3 className="text-lg font-bold tracking-tight text-ink">{title}</h3>
      {message && <p className="mt-2 max-w-sm text-sm text-ink-soft">{message}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-cardinal px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-cardinal-dark active:scale-95"
        >
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
