'use client';

import { useEffect, useMemo, useState } from 'react';
import { Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { fetchMultipliers, fetchWorkouts } from '@/lib/supabaseData';
import { getAllProfiles, Profile, profileToUser } from '@/lib/userProfile';
import { GROUP_ROSTER, rosterEntryFor, TEAMS } from '@/lib/data';
import { aggregateRower, last7Counts } from '@/lib/stats';
import RowerCard from '../components/RowerCard';
import FilterTabs, { FilterTab } from '../components/FilterTabs';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';

const GROUP_TABS: FilterTab[] = [
  { key: 'all', label: 'Everyone' },
  ...TEAMS.map((t) => ({ key: t.id, label: t.name })),
];

export default function RowersPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [w, m, p] = await Promise.all([
          fetchWorkouts(),
          fetchMultipliers(),
          getAllProfiles(),
        ]);
        setWorkouts(w);
        setConfigs(m.workoutTypeConfigs);
        setProfiles(p);
      } catch {
        setSignedOut(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Deep link from the Board's team standings: /rowers?group=group-2
  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get('group');
    if (g && GROUP_TABS.some((t) => t.key === g)) setGroup(g);
  }, []);

  const selectGroup = (key: string) => {
    setGroup(key);
    const url = key === 'all' ? window.location.pathname : `${window.location.pathname}?group=${key}`;
    window.history.replaceState(null, '', url);
  };

  const byUser = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      const list = map.get(w.oderId) ?? [];
      list.push(w);
      map.set(w.oderId, list);
    }
    return map;
  }, [workouts]);

  const rowers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles
      .map(profileToUser)
      .map((user) => {
        const userWorkouts = byUser.get(user.id) ?? [];
        const sorted = [...userWorkouts].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        return {
          user,
          aggregate: aggregateRower(userWorkouts, configs),
          spark: last7Counts(userWorkouts),
          latestWorkout: sorted[0],
        };
      })
      .filter((r) => (group === 'all' ? true : r.user.teamId === group))
      .filter((r) => (q ? r.user.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.aggregate.totalPoints - a.aggregate.totalPoints);
  }, [profiles, byUser, configs, query, group]);

  // Teammates on the sheet for this group who haven't made an account yet.
  const notJoined = useMemo(() => {
    if (group === 'all') return [];
    const claimed = new Set(
      profiles
        .filter((p) => p.teamId === group)
        .map((p) => rosterEntryFor(p.email, p.name)?.name)
        .filter((n): n is string => !!n)
    );
    return GROUP_ROSTER.filter((m) => m.teamId === group && !claimed.has(m.name));
  }, [group, profiles]);

  const activeTeam = TEAMS.find((t) => t.id === group);

  return (
    <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
      <div className="pb-4 pt-6 sm:pt-8">
        <h1 className="font-display text-xl font-semibold tracking-editorial text-charcoal sm:text-2xl">
          Rowers
        </h1>
        <p className="mt-1 text-[13px] text-charcoal-muted">
          {activeTeam ? `Who's in ${activeTeam.name}.` : 'Everyone who’s signed up. The squad grows here.'}
        </p>
      </div>

      {/* Training group */}
      <FilterTabs tabs={GROUP_TABS} active={group} onChange={selectGroup} className="mb-4" />

      {/* Search */}
      {profiles.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-light" />
          <input
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="focus-ring w-full rounded-xl border border-stone/40 bg-bone-dark/40 py-3 pl-10 pr-4 text-[15px] text-charcoal placeholder:text-charcoal-light"
          />
        </div>
      )}

      {loading ? (
        <LoadingState count={6} variant="list" />
      ) : signedOut ? (
        <EmptyState
          icon="lock"
          title="Sign in to see the roster"
          message="The rower directory is for the team."
          actionLabel="Log in"
          actionHref="/login"
        />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon="group_add"
          title="No rowers yet."
          message="As teammates sign up, they show up here. Someone has to start."
          actionLabel="Log the work"
          actionHref="/log"
        />
      ) : rowers.length === 0 && notJoined.length === 0 ? (
        <EmptyState icon="search_off" title="No match." message="Try a different name." />
      ) : (
        <>
          {rowers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rowers.map(({ user, aggregate, spark, latestWorkout }) => (
                <RowerCard key={user.id} user={user} aggregate={aggregate} sparkValues={spark} latestWorkout={latestWorkout} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-charcoal-muted">
              No one from this group has signed up yet.
            </p>
          )}

          {notJoined.length > 0 && (
            <div className="mt-7">
              <p className="label-caps text-charcoal-muted">
                Not signed up yet · {notJoined.length}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {notJoined.map((m) => (
                  <span
                    key={m.name}
                    className="rounded-pill border border-dashed border-stone/50 px-3 py-1.5 text-[12px] text-charcoal-muted"
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
