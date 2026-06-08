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
  const color = team?.color ?? '#b51c00';

  return (
    <section>
      <div className="flex items-center gap-5">
        <Avatar name={user.name} color={color} size={80} className="!text-2xl shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {user.name}
            {isSelf && (
              <span className="ml-2 align-middle text-xs font-medium text-ink-muted">(you)</span>
            )}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            {team && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {team.name}
              </span>
            )}
            {aggregate.streak > 0 && (
              <span className="flex items-center gap-1 text-cardinal">
                <Icon name="local_fire_department" size={15} fill />
                {aggregate.streak}d streak
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat ribbon */}
      <div className="mt-5 grid grid-cols-4 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-surface">
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
    <div className="px-3 py-4 sm:px-4 sm:py-5">
      <p className="label-caps text-ink-muted">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular sm:text-2xl ${accent ? 'text-cardinal' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
