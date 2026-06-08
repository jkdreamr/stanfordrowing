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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={user.name} color={color} size={88} className="!text-3xl" />
        <div className="min-w-0 flex-1">
          <p className="label-caps text-cardinal">Rower profile</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {user.name}
            {isSelf && (
              <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wide text-ink-muted">
                (you)
              </span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            {team && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {team.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Icon name="local_fire_department" size={16} className="text-cardinal" fill={aggregate.streak > 0} />
              {aggregate.streak} day streak
            </span>
          </div>
        </div>
      </div>

      {/* Stat ribbon */}
      <div className="mt-6 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <Stat label="Points" value={formatPreciseNumber(aggregate.totalPoints)} accent />
        <Stat label="Workouts" value={String(aggregate.totalWorkouts)} />
        <Stat label="Total km" value={formatPreciseNumber(aggregate.totalKm)} />
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-4 py-5">
      <p className="label-caps text-ink-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular ${accent ? 'text-cardinal' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
