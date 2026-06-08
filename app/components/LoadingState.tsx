interface LoadingStateProps {
  count?: number;
  variant?: 'feed' | 'list';
  className?: string;
}

export default function LoadingState({ count = 3, variant = 'feed', className = '' }: LoadingStateProps) {
  return (
    <div className={`space-y-4 ${className}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-stone-light" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-stone-light" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-bone-dark" />
            </div>
          </div>
          {variant === 'feed' && (
            <div className="px-4 pb-4">
              <div className="h-8 w-1/3 animate-pulse rounded bg-stone-light" />
              <div className="mt-3 h-2.5 w-2/3 animate-pulse rounded bg-bone-dark" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
