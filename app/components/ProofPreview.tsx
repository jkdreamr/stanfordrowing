'use client';

import { useEffect, useRef } from 'react';
import Icon from './Icon';

interface ProofPreviewProps {
  url: string;
  className?: string;
  /** Fill a fixed-size parent (the multi-photo carousel). Default: natural size. */
  fill?: boolean;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|heic)(\?|$)/i;
const VIDEO_RE = /\.(mp4|mov|m4v|webm|ogv|ogg|avi|mkv|qt)(\?|$)/i;

/** The whole photo/video is always shown (object-contain), capped so very tall media stays reasonable. */
const NATURAL = 'block max-h-[80vh] w-full object-contain';
const FILLED = 'absolute inset-0 h-full w-full object-contain';

export type ProofKind = 'image' | 'video' | 'link';

/** Classify a proof URL so the feed can render media inline. */
export function proofKind(url: string): ProofKind {
  if (VIDEO_RE.test(url)) return 'video';
  if (IMAGE_RE.test(url)) return 'image';
  // Uploaded proofs live in our buckets — default to image if no clear ext.
  if (url.includes('/workout-proofs/') || url.includes('/locker-media/')) return 'image';
  return 'link';
}

/**
 * Auto-playing feed video that only plays while on screen. Off-screen videos
 * pause and only preload metadata, so a video-heavy feed stays smooth.
 */
function AutoPlayVideo({ url, fill }: { url: string; fill?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.4 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={url}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      className={fill ? FILLED : NATURAL}
    />
  );
}

export default function ProofPreview({ url, className = '', fill = false }: ProofPreviewProps) {
  const kind = proofKind(url);

  if (kind === 'video') {
    if (fill) return <AutoPlayVideo url={url} fill />;
    return (
      <div className={`w-full bg-black ${className}`}>
        <AutoPlayVideo url={url} />
      </div>
    );
  }

  if (kind === 'image') {
    if (fill) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Workout proof" loading="lazy" className={FILLED} />
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noreferrer" className={`block bg-black ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Workout proof" loading="lazy" className={NATURAL} />
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
