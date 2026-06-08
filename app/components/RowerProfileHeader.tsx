'use client';

import { useRef } from 'react';
import { Team, User } from '@/lib/types';
import { formatPreciseNumber } from '@/lib/data';
import { RowerAggregate } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';

interface RowerProfileHeaderProps {
  user: User;
  team?: Team;
  aggregate: RowerAggregate;
  isSelf?: boolean;
  /** When provided (and isSelf), shows an edit control to change the photo. */
  onAvatarSelected?: (file: File) => void;
  uploadingAvatar?: boolean;
}

export default function RowerProfileHeader({
  user,
  team,
  aggregate,
  isSelf,
  onAvatarSelected,
  uploadingAvatar = false,
}: RowerProfileHeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = !!isSelf && !!onAvatarSelected;

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarSelected) onAvatarSelected(file);
    e.target.value = '';
  };

  return (
    <section>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar name={user.name} size={64} className="!text-xl" src={user.avatarUrl} />
          {editable && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-coral text-white ring-2 ring-bone transition-transform active:scale-90 disabled:opacity-60"
              >
                <Icon name={uploadingAvatar ? 'hourglass_empty' : 'photo_camera'} size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold tracking-editorial text-charcoal sm:text-2xl">
            {user.name}
            {isSelf && <span className="ml-2 text-[12px] font-normal text-charcoal-muted">(you)</span>}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-charcoal-muted">
            {aggregate.streak > 0 && (
              <span className="flex items-center gap-1 text-coral">
                <Icon name="local_fire_department" size={14} fill />
                {aggregate.streak}d streak
              </span>
            )}
            {editable && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-charcoal-muted underline-offset-2 hover:text-charcoal hover:underline disabled:opacity-60"
              >
                {uploadingAvatar ? 'Uploading…' : user.avatarUrl ? 'Change photo' : 'Add photo'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stat ribbon */}
      <div className="mt-5 grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-stone/30">
        <Stat label="Points" value={formatPreciseNumber(aggregate.totalPoints)} accent />
        <Stat label="Sessions" value={String(aggregate.totalWorkouts)} />
        <Stat label="km" value={formatPreciseNumber(aggregate.totalKm)} />
        <Stat label="hrs" value={(aggregate.totalMinutes / 60).toFixed(1)} />
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-bone-dark/50 px-3 py-3 sm:px-4 sm:py-4">
      <p className="text-[9px] font-medium uppercase tracking-wider text-charcoal-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular sm:text-xl ${accent ? 'text-coral' : 'text-charcoal'}`}>{value}</p>
    </div>
  );
}
