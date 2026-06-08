import Icon from './Icon';

interface ProofPreviewProps {
  url: string;
  className?: string;
  /** aspect ratio class for image, e.g. 'aspect-video' */
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

/**
 * Renders an image preview when the proof URL looks like an image,
 * otherwise a tidy "See the work" link chip.
 */
export default function ProofPreview({ url, className = '', aspect = 'aspect-video' }: ProofPreviewProps) {
  if (looksLikeImage(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`block overflow-hidden bg-container-low ${aspect} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Workout proof"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`focus-ring inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-cardinal hover:text-cardinal ${className}`}
    >
      <Icon name="link" size={16} />
      See the work
    </a>
  );
}
