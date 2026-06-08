interface LoadingStateProps {
  count?: number;
  variant?: 'feed' | 'list';
  className?: string;
}

export default function LoadingState({ count = 3, variant = 'feed', className = '' }: LoadingStateProps) {
  return (
    <div className={`space-y-5 ${className}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="flex items-center gap-3 p-5">
            <div className="skeleton h-10 w-10 shrink-0 animate-shimmer rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3 animate-shimmer rounded" />
              <div className="skeleton h-2.5 w-1/4 animate-shimmer rounded" />
            </div>
          </div>
          {variant === 'feed' && (
            <div className="px-5 pb-5">
              <div className="skeleton h-10 w-1/3 animate-shimmer rounded-lg" />
              <div className="skeleton mt-3 h-2.5 w-2/3 animate-shimmer rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
