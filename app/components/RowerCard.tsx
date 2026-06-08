import Link from 'next/link';
import { User, Workout } from '@/lib/types';
import { formatPreciseNumber, getTeamById } from '@/lib/data';
import { RowerAggregate, timeAgo } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';
import Sparkline from './Sparkline';

interface RowerCardProps {
  user: User;
  aggregate: RowerAggregate;
  sparkValues: number[];
  latestWorkout?: Workout;
}

export default function RowerCard({ user, aggregate, sparkValues, latestWorkout }: RowerCardProps) {
  const team = getTeamById(user.teamId);
  const color = team?.color ?? '#b51c00';

  return (
    <Link
      href={`/rowers/${user.id}`}
      className="card focus-ring group block rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lg"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} color={color} size={48} />
          <div>
            <h3 className="text-base font-bold leading-tight text-ink">{user.name}</h3>
            {team && (
              <p className="label-caps mt-1 flex items-center gap-1.5 text-ink-muted">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="normal-case tracking-normal">{team.name}</span>
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="label-caps text-ink-muted">Streak</span>
          <div className="mt-0.5 flex items-center justify-end gap-1 text-cardinal">
            <Icon name="local_fire_department" size={16} fill={aggregate.streak > 0} />
            <span className="text-lg font-bold leading-none tabular">{aggregate.streak}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-container-low/60 p-3">
          <span className="label-caps text-ink-muted">Pts</span>
          <p className="mt-1 text-base font-bold tabular text-ink">{formatPreciseNumber(aggregate.totalPoints)}</p>
        </div>
        <div className="rounded-xl bg-container-low/60 p-3">
          <span className="label-caps text-ink-muted">Sessions</span>
          <p className="mt-1 text-base font-bold tabular text-ink">{aggregate.totalWorkouts}</p>
        </div>
        <div className="rounded-xl bg-container-low/60 p-3">
          <span className="label-caps text-ink-muted">Km</span>
          <p className="mt-1 text-base font-bold tabular text-ink">{formatPreciseNumber(aggregate.totalKm)}</p>
        </div>
      </div>
      {latestWorkout && (
        <p className="mb-3 truncate text-xs text-ink-muted">
          Last · {timeAgo(latestWorkout.createdAt)}{latestWorkout.notes ? ` — ${latestWorkout.notes}` : ''}
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label-caps text-ink-muted">Last 7 days</span>
          <span className="label-caps text-cardinal opacity-0 transition-opacity group-hover:opacity-100">
            View →
          </span>
        </div>
        <Sparkline values={sparkValues} color={color} height={28} />
      </div>
    </Link>
  );
}
