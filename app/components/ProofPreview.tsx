import Icon from './Icon';

interface ProofPreviewProps {
  url: string;
  className?: string;
  aspect?: string;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|heic)(\?|$)/i;
const VIDEO_RE = /\.(mp4|mov|m4v|webm|ogv|ogg|avi|mkv|qt)(\?|$)/i;

export type ProofKind = 'image' | 'video' | 'link';

/** Classify a proof URL so the feed can render media inline. */
export function proofKind(url: string): ProofKind {
  if (VIDEO_RE.test(url)) return 'video';
  if (IMAGE_RE.test(url)) return 'image';
  // Uploaded proofs live in our buckets — default to image if no clear ext.
  if (url.includes('/workout-proofs/') || url.includes('/locker-media/')) return 'image';
  return 'link';
}

export default function ProofPreview({ url, className = '', aspect = 'aspect-video' }: ProofPreviewProps) {
  const kind = proofKind(url);

  if (kind === 'video') {
    return (
      <div className={`relative w-full overflow-hidden bg-black ${aspect} ${className}`}>
        <video
          src={url}
          controls
          playsInline
          muted
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (kind === 'image') {
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

  // External link — a tidy full-width bar.
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`flex w-full items-center gap-2 bg-stone-light/30 px-4 py-3 text-[12px] font-medium text-charcoal-soft transition-colors hover:text-coral ${className}`}
    >
      <Icon name="link" size={14} />
      See the work
      <Icon name="open_in_new" size={13} className="ml-auto text-charcoal-light" />
    </a>
  );
}
