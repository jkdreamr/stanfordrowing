'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { formatPstDate, getPstDateString } from '@/lib/data';
import {
  PLAN_DAYS,
  PLAN_END,
  PLAN_START,
  SESSION_BONUS,
  sessionRequirement,
} from '@/lib/trainingPlan';
import Icon from '../components/Icon';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanPage() {
  const today = getPstDateString();

  const weeks = useMemo(() => {
    const byWeek = new Map<number, typeof PLAN_DAYS>();
    for (const day of PLAN_DAYS) {
      byWeek.set(day.week, [...(byWeek.get(day.week) ?? []), day]);
    }
    return Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);
  }, []);

  const short = (date: string) => formatPstDate(date, { month: 'short', day: 'numeric' });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="pb-4 pt-6 sm:pt-8">
        <h1 className="font-display text-xl font-semibold tracking-editorial text-charcoal sm:text-2xl">
          Preseason plan
        </h1>
        <p className="mt-1 text-[13px] text-charcoal-muted">
          {short(PLAN_START)} – {short(PLAN_END)} · the month before school starts.
        </p>
      </div>

      {/* How scoring works — the same rules the board uses */}
      <div className="card mb-6 p-5">
        <p className="label-caps text-charcoal-muted">How points work</p>
        <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-charcoal-soft">
          <li className="flex gap-2.5">
            <Icon name="check_circle" size={17} fill className="mt-px shrink-0 text-coral" />
            <span>
              <span className="font-semibold text-charcoal">Everything you log earns points</span> —
              scored by what it is, the same as always (erg by metres, lifts by minutes, and so on).
            </span>
          </li>
          <li className="flex gap-2.5">
            <Icon name="star" size={17} fill className="mt-px shrink-0 text-coral" />
            <span>
              <span className="font-semibold text-charcoal">Log it as the day&apos;s session and you get +{SESSION_BONUS} on top.</span>{' '}
              Same work, more points — following the plan is always the easiest way to score.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Icon name="history" size={17} className="mt-px shrink-0 text-charcoal-light" />
            <span>
              Work logged before {short(PLAN_START)} is kept as{' '}
              <span className="font-semibold text-charcoal">legacy</span> — still on your profile,
              but the board started fresh at zero.
            </span>
          </li>
        </ul>
        <Link
          href="/log"
          className="focus-ring mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-coral px-5 text-[13px] font-semibold text-white hover:bg-coral-dark"
        >
          <Icon name="add" size={17} />
          Log today
        </Link>
      </div>

      {weeks.map(([week, days]) => (
        <section key={week} className="mb-6">
          <h2 className="mb-2.5 flex items-baseline gap-2">
            <span className="font-display text-[15px] font-semibold tracking-editorial text-charcoal">
              Week {week}
            </span>
            <span className="text-[11px] text-charcoal-muted">
              {short(days[0].date)} – {short(days[days.length - 1].date)}
            </span>
          </h2>

          <div className="card divide-y divide-white/[0.06] overflow-hidden">
            {days.map((day, i) => {
              const isToday = day.date === today;
              const rest = day.sessions.length === 0;
              return (
                <div
                  key={day.date}
                  className={`flex gap-3 px-4 py-3 ${isToday ? 'bg-coral/[0.08]' : ''}`}
                >
                  <div className="w-14 shrink-0">
                    <p
                      className={`text-[12px] font-semibold ${isToday ? 'text-coral' : 'text-charcoal'}`}
                    >
                      {WEEKDAYS[i]}
                    </p>
                    <p className="text-[10.5px] text-charcoal-muted">{short(day.date)}</p>
                    {isToday && (
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-coral">
                        Today
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {rest ? (
                      <p className="text-[13px] text-charcoal-muted">Off — rest.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {day.sessions.map((session) => (
                          <div key={session.slot} className="min-w-0">
                            <p className="text-[13px] leading-snug text-charcoal">
                              <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
                                {session.slot}
                              </span>
                              {session.label}
                            </p>
                            <p className="text-[11px] text-charcoal-muted">
                              Target {sessionRequirement(session)} · +{SESSION_BONUS} bonus
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="card p-5">
        <p className="label-caps text-charcoal-muted">The lifts</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { name: 'Lift 1', main: 'Squat', second: 'Shoulder Press' },
            { name: 'Lift 2', main: 'Bench', second: 'Pull ups' },
            { name: 'Lift 3', main: 'Deadlift', second: 'Bulgarian Split Squats' },
          ].map((lift) => (
            <div key={lift.name} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
              <p className="text-[12.5px] font-semibold text-charcoal">{lift.name}</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-soft">
                {lift.main} <span className="text-charcoal-muted">5 × 5</span>
                <br />
                {lift.second} <span className="text-charcoal-muted">4 × 8–12</span>
                <br />
                <span className="text-charcoal-muted">Your choice · Core 15&apos; · Mobility 15&apos;</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-charcoal-muted">
          A rough guide so you&apos;re ready for the movements we do in season. Personalise it as you
          like, as long as you stay safe and prepared.
        </p>
      </div>
    </div>
  );
}
