import Link from 'next/link';
import { User, Workout } from '@/lib/types';
import { formatPreciseNumber } from '@/lib/data';
import { RowerAggregate, timeAgo } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';

interface RowerCardProps {
  user: User;
  aggregate: RowerAggregate;
  sparkValues: number[];
  latestWorkout?: Workout;
}

export default function RowerCard({ user, aggregate, latestWorkout }: RowerCardProps) {
  return (
    <Link
      href={`/rowers/${user.id}`}
      className="card focus-ring group block p-4 transition-all duration-200 hover:shadow-card-hover"
    >
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size={42} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-charcoal">{user.name}</h3>
          {latestWorkout && (
            <p className="mt-0.5 truncate text-[11px] text-charcoal-muted">
              Last active {timeAgo(latestWorkout.createdAt)}
            </p>
          )}
        </div>
        {aggregate.streak > 0 && (
          <span className="flex items-center gap-0.5 text-coral">
            <Icon name="local_fire_department" size={14} fill />
            <span className="text-[12px] font-bold tabular">{aggregate.streak}</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-4 text-center">
        <div className="flex-1">
          <p className="text-[16px] font-bold tabular text-charcoal">{formatPreciseNumber(aggregate.totalPoints)}</p>
          <p className="text-[9px] font-medium uppercase tracking-wider text-charcoal-light">Pts</p>
        </div>
        <div className="flex-1">
          <p className="text-[16px] font-bold tabular text-charcoal">{aggregate.totalWorkouts}</p>
          <p className="text-[9px] font-medium uppercase tracking-wider text-charcoal-light">Sessions</p>
        </div>
        <div className="flex-1">
          <p className="text-[16px] font-bold tabular text-charcoal">{formatPreciseNumber(aggregate.totalKm)}</p>
          <p className="text-[9px] font-medium uppercase tracking-wider text-charcoal-light">Km</p>
        </div>
      </div>
    </Link>
  );
}
