'use client';

import { useRef, useState } from 'react';
import Icon from './Icon';

interface StoryComposerProps {
  /** Upload the chosen photo/video as a story. Should resolve when done. */
  onPick: (file: File) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Instagram-style story creator. Opened by swiping left on the feed.
 * Center shutter launches the device camera; bottom-left opens the photo library.
 * (Web can't render a live camera feed reliably, so the shutter uses the OS
 * camera via a capture-enabled file input.)
 */
export default function StoryComposer({ onPick, onClose }: StoryComposerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await onPick(file);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black animate-fade-in" role="dialog" aria-label="New story">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 active:scale-95 touch-manipulation"
        >
          <Icon name="close" size={20} />
        </button>
        <p className="text-[15px] font-semibold text-white">New story</p>
        <span className="h-10 w-10" aria-hidden />
      </div>

      {/* Stage */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-white">
          <Icon name="photo_camera" size={36} />
        </span>
        <p className="text-[17px] font-semibold text-white">Share a moment</p>
        <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-white/60">
          Tap the shutter to capture a photo or video, or pull one from your library.
        </p>
        {busy && (
          <div className="mt-6 flex items-center gap-2 text-[13px] font-medium text-white/80">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Posting…
          </div>
        )}
      </div>

      {/* Bottom controls — library (left) · shutter (center) */}
      <div
        className="relative flex items-center justify-center px-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)', paddingTop: '8px' }}
      >
        {/* Photo library — bottom left, IG-style */}
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          disabled={busy}
          aria-label="Open photo library"
          className="absolute left-8 bottom-[calc(env(safe-area-inset-bottom,0px)+28px)] flex h-12 w-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-transform active:scale-95 disabled:opacity-50 touch-manipulation"
        >
          <Icon name="photo_library" size={24} />
        </button>

        {/* Shutter — center */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          aria-label="Open camera"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full ring-4 ring-white/30 transition-transform active:scale-95 disabled:opacity-50 touch-manipulation"
        >
          <span className="h-[58px] w-[58px] rounded-full bg-white" />
        </button>
      </div>

      {/* Camera capture (rear camera) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {/* Photo library (no capture → opens picker) */}
      <input ref={libraryRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
