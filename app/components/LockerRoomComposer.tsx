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
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
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
      setError('Could not post. Check connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={user.name} size={36} src={user.avatarUrl} />
        <div className="min-w-0 flex-1">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="focus-ring min-h-[48px] w-full rounded-xl border border-stone/40 bg-bone-dark/40 px-4 py-3 text-left text-[14px] text-charcoal-muted transition-colors hover:border-stone touch-manipulation"
            >
              Drop something for the squad...
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="For when someone needs a push."
                rows={3}
                autoFocus
                enterKeyHint="send"
                className="focus-ring w-full resize-none rounded-xl border border-stone/40 bg-bone-dark/40 px-4 py-3 text-[15px] text-charcoal placeholder:text-charcoal-muted"
              />

              {file && (
                <div className="flex items-center justify-between rounded-lg border border-stone/40 bg-bone-dark/40 px-3 py-2 text-[12px]">
                  <span className="flex min-w-0 items-center gap-1.5 text-charcoal-soft">
                    <Icon name={file.type.startsWith('video/') ? 'videocam' : 'image'} size={14} className="shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value=''; }} className="flex h-8 w-8 items-center justify-center rounded-full text-coral hover:bg-coral/10 touch-manipulation">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              )}
              {showLink && !file && (
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Paste a link"
                  className="focus-ring w-full rounded-lg border border-stone/40 bg-bone-dark/40 px-3 py-2 text-[13px] text-charcoal placeholder:text-charcoal-muted"
                />
              )}

              {error && <p className="text-[11px] font-medium text-coral">{error}</p>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const picked = e.target.files?.[0] ?? null;
                      if (picked && picked.size > 50 * 1024 * 1024) {
                        setError('That file is too big — keep it under 50 MB.');
                        e.target.value = '';
                        return;
                      }
                      setError('');
                      setFile(picked);
                      setShowLink(false);
                      setLinkUrl('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="focus-ring flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-charcoal-muted hover:bg-stone-light hover:text-charcoal touch-manipulation"
                  >
                    <Icon name="add_photo_alternate" size={18} />
                    Media
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowLink((v) => !v); setFile(null); }}
                    className="focus-ring flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-charcoal-muted hover:bg-stone-light hover:text-charcoal touch-manipulation"
                  >
                    <Icon name="link" size={18} />
                    Link
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { reset(); setOpen(false); }}
                    className="focus-ring min-h-[40px] rounded-lg px-4 py-2 text-[13px] font-medium text-charcoal-muted hover:text-charcoal touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="focus-ring min-h-[40px] rounded-full bg-coral px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark active:scale-95 disabled:opacity-40 touch-manipulation"
                  >
                    {submitting ? 'Posting...' : 'Post'}
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
