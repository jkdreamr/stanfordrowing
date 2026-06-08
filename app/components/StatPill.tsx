import { ReactNode } from 'react';

interface StatPillProps {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: boolean;
  className?: string;
}

/** Compact labelled stat used in cards and stat rows. */
export default function StatPill({ label, value, unit, accent = false, className = '' }: StatPillProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="label-caps text-ink-muted">{label}</span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className={`tabular text-lg font-bold leading-none ${accent ? 'text-cardinal' : 'text-ink'}`}>
          {value}
        </span>
        {unit && <span className="label-caps text-ink-muted">{unit}</span>}
      </span>
    </div>
  );
}
