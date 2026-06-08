'use client';

import { useRef, useState } from 'react';
import { LockerMediaType, LockerPost, User } from '@/lib/types';
import { createLockerPost, uploadLockerImage } from '@/lib/lockerRoom';
import Avatar from './Avatar';
import Icon from './Icon';

interface LockerRoomComposerProps {
  user: User;
  onCreated: (post: LockerPost) => void;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i;

function classifyLink(url: string): { mediaType: LockerMediaType; mediaUrl?: string; linkUrl?: string } {
  if (IMAGE_RE.test(url)) return { mediaType: 'image', mediaUrl: url };
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) return { mediaType: 'video', linkUrl: url };
  return { mediaType: 'link', linkUrl: url };
}

export default function LockerRoomComposer({ user, onCreated }: LockerRoomComposerProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setBody('');
    setLinkUrl('');
    setShowLink(false);
    setFile(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const canSubmit = (body.trim().length > 0 || !!file || linkUrl.trim().length > 0) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      let mediaUrl: string | undefined;
      let mediaType: LockerMediaType = null;
      let finalLink: string | undefined;

      if (file) {
        mediaUrl = await uploadLockerImage(file, user.id);
        mediaType = 'image';
      } else if (linkUrl.trim()) {
        const classified = classifyLink(linkUrl.trim());
        mediaType = classified.mediaType;
        mediaUrl = classified.mediaUrl;
        finalLink = classified.linkUrl;
      }

      const post = await createLockerPost({
        user,
        body: body.trim(),
        mediaUrl,
        mediaType,
        linkUrl: finalLink,
      });
      onCreated(post);
      reset();
      setOpen(false);
    } catch {
      setError('Could not post right now. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <Avatar name={user.name} size={40} />
        <div className="min-w-0 flex-1">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="focus-ring w-full rounded-xl border border-line bg-container-low/60 px-4 py-3 text-left text-sm text-ink-muted transition-colors hover:border-ink/20"
            >
              Drop something for the squad…
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="For when someone needs a push."
                rows={3}
                autoFocus
                className="focus-ring w-full resize-none rounded-xl border border-line bg-container-low/60 px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted"
              />

              {/* Attachments */}
              {file && (
                <div className="flex items-center justify-between rounded-xl border border-line bg-container-low/60 px-3 py-2 text-sm text-ink">
                  <span className="flex items-center gap-2 truncate">
                    <Icon name="image" size={18} className="text-ink-soft" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value=''; }} className="text-cardinal">
                    <Icon name="close" size={18} />
                  </button>
                </div>
              )}
              {showLink && !file && (
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Paste an image, YouTube, or article link"
                  className="focus-ring w-full rounded-xl border border-line bg-container-low/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted"
                />
              )}

              {error && <p className="text-xs font-medium text-cardinal">{error}</p>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setShowLink(false); setLinkUrl(''); }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-container-low hover:text-ink"
                  >
                    <Icon name="add_photo_alternate" size={18} />
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowLink((v) => !v); setFile(null); }}
                    className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-container-low hover:text-ink"
                  >
                    <Icon name="link" size={18} />
                    Link
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { reset(); setOpen(false); }}
                    className="focus-ring rounded-full px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-cardinal px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-cardinal-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
