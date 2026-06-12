'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

interface StoryComposerProps {
  /** Upload the chosen photo/video as a story. Should resolve when done. */
  onPick: (file: File) => Promise<void> | void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Filters. `css` drives the live preview; the same look is baked into the
// exported photo with a color matrix (works everywhere, unlike ctx.filter).
// ---------------------------------------------------------------------------

type Matrix = { m: number[]; o: number[] }; // 3x3 row-major + offset

const I: Matrix = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], o: [0, 0, 0] };

function mul(a: Matrix, b: Matrix): Matrix {
  // apply b first, then a
  const m = new Array(9).fill(0);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let k = 0; k < 3; k++) m[r * 3 + c] += a.m[r * 3 + k] * b.m[k * 3 + c];
  const o = [0, 1, 2].map((r) => a.m[r * 3] * b.o[0] + a.m[r * 3 + 1] * b.o[1] + a.m[r * 3 + 2] * b.o[2] + a.o[r]);
  return { m, o };
}

function saturate(s: number): Matrix {
  return {
    m: [
      0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ],
    o: [0, 0, 0],
  };
}

// NOTE: no inner closures here — the Next 14 SWC minifier mis-inlines them
// (it constant-folds some calls and leaves dangling identifiers), which
// crashed every page at module load in production builds.
function sepia(amount: number): Matrix {
  const keep = 1 - amount;
  return {
    m: [
      keep + 0.393 * amount, 0.769 * amount, 0.189 * amount,
      0.349 * amount, keep + 0.686 * amount, 0.168 * amount,
      0.272 * amount, 0.534 * amount, keep + 0.131 * amount,
    ],
    o: [0, 0, 0],
  };
}

function hueRotate(deg: number): Matrix {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    m: [
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ],
    o: [0, 0, 0],
  };
}

function brightness(b: number): Matrix {
  return { m: [b, 0, 0, 0, b, 0, 0, 0, b], o: [0, 0, 0] };
}

function contrast(c: number): Matrix {
  const off = 127.5 * (1 - c);
  return { m: [c, 0, 0, 0, c, 0, 0, 0, c], o: [off, off, off] };
}

function compose(...ops: Matrix[]): Matrix {
  return ops.reduce((acc, op) => mul(op, acc), I);
}

interface Filter {
  id: string;
  label: string;
  css: string;
  matrix: Matrix;
}

const FILTERS: Filter[] = [
  { id: 'normal', label: 'Normal', css: 'none', matrix: I },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.08)', matrix: compose(saturate(0), contrast(1.08)) },
  { id: 'warm', label: 'Warm', css: 'sepia(0.32) saturate(1.35) contrast(1.03)', matrix: compose(sepia(0.32), saturate(1.35), contrast(1.03)) },
  { id: 'cool', label: 'Cool', css: 'saturate(1.15) hue-rotate(-12deg) brightness(1.04)', matrix: compose(saturate(1.15), hueRotate(-12), brightness(1.04)) },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.45) contrast(1.1)', matrix: compose(saturate(1.45), contrast(1.1)) },
  { id: 'fade', label: 'Fade', css: 'contrast(0.88) brightness(1.1) saturate(0.85)', matrix: compose(contrast(0.88), brightness(1.1), saturate(0.85)) },
];

const TEXT_COLORS = ['#ffffff', '#0d1110', '#c8202b', '#ffd60a', '#5ac8fa'];

const MAX_EXPORT_DIM = 1620;

// ---------------------------------------------------------------------------

export default function StoryComposer({ onPick, onClose }: StoryComposerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // Edit stage (photos only)
  const [photo, setPhoto] = useState<{ url: string; file: File } | null>(null);
  const [filterId, setFilterId] = useState('normal');
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [textPos, setTextPos] = useState({ x: 50, y: 42 }); // % of stage
  const [editingText, setEditingText] = useState(false);

  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];

  // Free the preview object URL when it changes / on unmount.
  useEffect(() => {
    const url = photo?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo?.url]);

  const post = async (file: File) => {
    setBusy(true);
    try {
      await onPick(file);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type.startsWith('video/')) {
      // Videos post directly — effects are for photos.
      await post(file);
      return;
    }
    setFilterId('normal');
    setText('');
    setTextPos({ x: 50, y: 42 });
    setPhoto({ url: URL.createObjectURL(file), file });
  };

  // Drag the text sticker around the stage.
  const onTextDrag = (e: React.TouchEvent) => {
    const stage = stageRef.current;
    if (!stage) return;
    const point = e.touches[0];
    if (!point) return;
    const rect = stage.getBoundingClientRect();
    setTextPos({
      x: Math.min(90, Math.max(10, ((point.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(85, Math.max(10, ((point.clientY - rect.top) / rect.height) * 100)),
    });
  };

  /** Bake filter + text into a JPEG and post it. */
  const share = async () => {
    if (!photo || busy) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = photo.url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('load'));
      });

      const scale = Math.min(1, MAX_EXPORT_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(img, 0, 0, w, h);

      // Color matrix per pixel — consistent on every browser.
      if (filter.id !== 'normal') {
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;
        const { m, o } = filter.matrix;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          px[i] = Math.max(0, Math.min(255, m[0] * r + m[1] * g + m[2] * b + o[0]));
          px[i + 1] = Math.max(0, Math.min(255, m[3] * r + m[4] * g + m[5] * b + o[1]));
          px[i + 2] = Math.max(0, Math.min(255, m[6] * r + m[7] * g + m[8] * b + o[2]));
        }
        ctx.putImageData(data, 0, 0);
      }

      const caption = text.trim();
      if (caption) {
        const fontSize = Math.round(w * 0.075);
        ctx.font = `700 ${fontSize}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = fontSize * 0.18;
        const lines = caption.split('\n');
        const lineHeight = fontSize * 1.22;
        const startY = (textPos.y / 100) * h - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line, (textPos.x / 100) * w, startY + idx * lineHeight, w * 0.92);
        });
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('export');
      await post(new File([blob], 'story.jpg', { type: 'image/jpeg' }));
    } catch {
      // Editing failed (rare) — fall back to posting the original photo.
      await post(photo.file);
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------------ render

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black animate-fade-in" role="dialog" aria-label="New story" data-no-swipe>
      {/* Top bar */}
      <div
        className="z-10 flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <button
          type="button"
          onClick={() => (photo ? setPhoto(null) : onClose())}
          aria-label={photo ? 'Back' : 'Close'}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 active:scale-95 touch-manipulation"
        >
          <Icon name={photo ? 'arrow_back' : 'close'} size={20} />
        </button>
        <p className="text-[15px] font-semibold text-white">{photo ? 'Edit' : 'New story'}</p>
        {photo ? (
          <button
            type="button"
            onClick={() => setEditingText(true)}
            aria-label="Add text"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-[15px] font-bold text-white transition-colors hover:bg-white/25 active:scale-95 touch-manipulation"
          >
            Aa
          </button>
        ) : (
          <span className="h-10 w-10" aria-hidden />
        )}
      </div>

      {!photo ? (
        <>
          {/* Pick stage */}
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
            <button
              type="button"
              onClick={() => libraryRef.current?.click()}
              disabled={busy}
              aria-label="Open photo library"
              className="absolute left-8 bottom-[calc(env(safe-area-inset-bottom,0px)+28px)] flex h-12 w-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-transform active:scale-95 disabled:opacity-50 touch-manipulation"
            >
              <Icon name="photo_library" size={24} />
            </button>
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
        </>
      ) : (
        <>
          {/* Edit stage */}
          <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Story preview" className="max-h-full w-full object-contain" style={{ filter: filter.css }} />

            {/* Draggable text sticker */}
            {text.trim() && !editingText && (
              <div
                role="button"
                aria-label="Move text"
                onTouchMove={onTextDrag}
                onClick={() => setEditingText(true)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none whitespace-pre-wrap px-4 text-center text-[28px] font-bold leading-tight"
                style={{
                  left: `${textPos.x}%`,
                  top: `${textPos.y}%`,
                  color: textColor,
                  textShadow: '0 1px 12px rgba(0,0,0,0.55)',
                  maxWidth: '92%',
                  touchAction: 'none',
                }}
              >
                {text}
              </div>
            )}

            {busy && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Posting…
                </div>
              </div>
            )}
          </div>

          {/* Filters + share */}
          <div
            className="space-y-3 px-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
          >
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1" data-no-swipe>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterId(f.id)}
                  aria-pressed={f.id === filterId}
                  className="flex shrink-0 flex-col items-center gap-1.5 touch-manipulation"
                >
                  <span
                    className={`block h-14 w-14 overflow-hidden rounded-xl ${
                      f.id === filterId ? 'ring-2 ring-coral' : 'ring-1 ring-white/15'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="h-full w-full object-cover" style={{ filter: f.css }} />
                  </span>
                  <span className={`text-[10px] font-semibold ${f.id === filterId ? 'text-white' : 'text-white/55'}`}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={share}
              disabled={busy}
              className="focus-ring flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-semibold text-white transition-all hover:bg-coral-dark active:scale-[0.99] disabled:opacity-50 touch-manipulation"
            >
              <Icon name="send" size={18} />
              Share to story
            </button>
          </div>

          {/* Text editor overlay */}
          {editingText && (
            <div className="absolute inset-0 z-30 flex flex-col bg-black/70 backdrop-blur-sm" data-no-swipe>
              <div
                className="flex items-center justify-end px-4 pb-2"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
              >
                <button
                  type="button"
                  onClick={() => setEditingText(false)}
                  className="rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-black transition-transform active:scale-95 touch-manipulation"
                >
                  Done
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center px-6">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 120))}
                  autoFocus
                  rows={2}
                  placeholder="Say something"
                  className="w-full resize-none bg-transparent text-center text-[28px] font-bold leading-tight placeholder-white/35 focus:outline-none"
                  style={{ color: textColor, textShadow: '0 1px 12px rgba(0,0,0,0.55)' }}
                />
              </div>
              <div
                className="flex items-center justify-center gap-3"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)' }}
              >
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTextColor(c)}
                    aria-label={`Text color ${c}`}
                    aria-pressed={c === textColor}
                    className={`h-9 w-9 rounded-full transition-transform active:scale-90 touch-manipulation ${
                      c === textColor ? 'ring-[3px] ring-white' : 'ring-2 ring-white/30'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
