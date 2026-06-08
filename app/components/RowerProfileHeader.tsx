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
}

export default function RowerProfileHeader({ user, team, aggregate, isSelf }: RowerProfileHeaderProps) {
  return (
    <section>
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size={64} className="!text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold tracking-editorial text-charcoal sm:text-2xl">
            {user.name}
            {isSelf && (
              <span className="ml-2 text-[12px] font-normal text-charcoal-muted">(you)</span>
            )}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-charcoal-muted">
            {aggregate.streak > 0 && (
              <span className="flex items-center gap-1 text-coral">
                <Icon name="local_fire_department" size={14} fill />
                {aggregate.streak}d streak
              </span>
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
