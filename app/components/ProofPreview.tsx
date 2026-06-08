import Icon from './Icon';

interface ProofPreviewProps {
  url: string;
  className?: string;
  aspect?: string;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|heic)(\?|$)/i;

function looksLikeImage(url: string): boolean {
  return (
    IMAGE_RE.test(url) ||
    url.includes('/workout-proofs/') ||
    url.includes('/locker-media/')
  );
}

export default function ProofPreview({ url, className = '', aspect = 'aspect-video' }: ProofPreviewProps) {
  if (looksLikeImage(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`block overflow-hidden bg-stone-light ${aspect} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Workout proof"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border border-stone px-3 py-1.5 text-[11px] font-medium text-charcoal-soft transition-colors hover:border-coral hover:text-coral ${className}`}
    >
      <Icon name="link" size={14} />
      See the work
    </a>
  );
}
