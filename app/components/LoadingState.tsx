interface LoadingStateProps {
  /** number of skeleton cards to render */
  count?: number;
  variant?: 'feed' | 'list';
  className?: string;
}

/** Skeleton placeholders shown while data loads (avoids layout shift). */
export default function LoadingState({ count = 3, variant = 'feed', className = '' }: LoadingStateProps) {
  return (
    <div className={`space-y-4 ${className}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-container-high" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-container-high" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-container-low" />
            </div>
          </div>
          {variant === 'feed' && (
            <div className="px-4 pb-4">
              <div className="h-7 w-2/5 animate-pulse rounded bg-container-high" />
              <div className="mt-4 h-2.5 w-3/4 animate-pulse rounded bg-container-low" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
