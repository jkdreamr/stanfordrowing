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
    <div className={`flex flex-col items-center px-6 py-16 text-center ${className}`}>
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-light">
        <Icon name={icon} className="text-charcoal-light" size={26} />
      </span>
      <h3 className="text-base font-semibold text-charcoal">{title}</h3>
      {message && <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-charcoal-muted">{message}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="focus-ring mt-5 rounded-full bg-coral px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark active:scale-95"
        >
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
