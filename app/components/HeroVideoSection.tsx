'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import FloatingAppCard from './FloatingAppCard';

interface HeroVideoSectionProps {
  recent?: { name: string; type: string; stat: string; meta: string; respect: number } | null;
  squadValue: string;
  squadWorkouts: number;
  topRowerName?: string | null;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/* ---- floating card bodies (shared between desktop overlay + mobile row) ---- */

function RecentCard({ recent }: { recent: NonNullable<HeroVideoSectionProps['recent']> }) {
  return (
    <div className="w-64 rounded-2xl border border-black/5 bg-[#fbfaf8] p-4 shadow-float">
      <div className="flex items-center gap-2.5">
        <Avatar name={recent.name} size={34} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-charcoal">{recent.name}</p>
          <p className="label-caps text-charcoal-muted">{recent.type}</p>
        </div>
        <span className="ml-auto rounded-full bg-coral-soft px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-coral">
          {recent.meta}
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-editorial text-charcoal tabular">
        {recent.stat}
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-charcoal-muted">
        <Icon name="favorite" size={16} className="text-coral" fill />
        <span className="text-[12px] font-medium">{recent.respect} respect</span>
      </div>
    </div>
  );
}

function WeekCard({ value, workouts }: { value: string; workouts: number }) {
  return (
    <div className="w-52 rounded-2xl border border-[#2b332d] bg-night p-4 text-bone shadow-float">
      <p className="label-caps text-bone/55">Squad · this week</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-editorial tabular">{value}</p>
      <p className="mt-1 text-[12px] text-bone/60">{workouts} workouts logged</p>
    </div>
  );
}

function QuoteCard() {
  return (
    <div className="w-56 rounded-2xl border border-black/5 bg-[#fbfaf8] p-4 shadow-float">
      <p className="label-caps text-coral">Locker Room</p>
      <p className="mt-2 font-display text-lg font-medium leading-snug tracking-editorial text-charcoal">
        “The work shows.”
      </p>
      <p className="mt-2 text-[11px] text-charcoal-muted">For when you need a push.</p>
    </div>
  );
}

function FadeUp({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export default function HeroVideoSection({
  recent,
  squadValue,
  squadWorkouts,
  topRowerName,
}: HeroVideoSectionProps) {
  const reduce = useReducedMotion();
  const fallbackRecent = recent ?? {
    name: topRowerName || 'The squad',
    type: 'Morning miles',
    stat: '18.4 km',
    meta: 'Early',
    respect: 12,
  };

  return (
    <section className="relative isolate overflow-hidden bg-forest text-bone">
      {/* Cinematic media — video if present, else layered gradient placeholder */}
      <div className="absolute inset-0 -z-10 hero-media">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
          className="h-full w-full object-cover opacity-90"
          aria-hidden
        >
          <source src="/hero-rowing.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 hero-water" />
        <div className="grain absolute inset-0 opacity-[0.12] mix-blend-overlay" />
        {/* legibility + bottom fade into the page */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest/90 via-forest/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bone" />
      </div>

      <div className="mx-auto grid max-w-container grid-cols-1 gap-8 px-5 pb-16 pt-10 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Copy */}
        <div className="lg:col-span-6 lg:self-center">
          <FadeUp>
            <span className="label-caps inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-bone/70">
              <span className="h-1.5 w-1.5 rounded-full bg-coral-bright" />
              Private training log · Stanford Rowing
            </span>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h1 className="mt-5 text-balance font-display text-[44px] font-semibold leading-[1.02] tracking-editorial text-bone sm:text-6xl lg:text-[68px]">
              Summer work,<br />kept honest.
            </h1>
          </FadeUp>
          <FadeUp delay={0.16}>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-bone/70 sm:text-base">
              Log sessions. Respect the work. Keep up with the squad.
            </p>
          </FadeUp>
          <FadeUp delay={0.24}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/log"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-[14px] font-semibold text-white shadow-float-sm transition-all hover:bg-coral-dark active:scale-[0.98]"
              >
                <Icon name="add" size={18} />
                Log the work
              </Link>
              <Link
                href="/rowers"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3 text-[14px] font-semibold text-bone backdrop-blur transition-colors hover:bg-white/10"
              >
                See the squad
              </Link>
            </div>
          </FadeUp>

          {/* Mobile floating cards — horizontal scroll under the CTA */}
          <div className="no-scrollbar -mx-5 mt-8 flex gap-3 overflow-x-auto px-5 pb-1 lg:hidden">
            <FloatingAppCard delay={0.1} className="shrink-0"><RecentCard recent={fallbackRecent} /></FloatingAppCard>
            <FloatingAppCard delay={0.18} className="shrink-0"><WeekCard value={squadValue} workouts={squadWorkouts} /></FloatingAppCard>
            <FloatingAppCard delay={0.26} className="shrink-0"><QuoteCard /></FloatingAppCard>
          </div>
        </div>

        {/* Desktop layered cards */}
        <div className="relative hidden lg:col-span-6 lg:block">
          <div className="relative mx-auto h-[420px] w-full max-w-md">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="absolute left-2 top-4"
            >
              <div className="transition-transform duration-300 hover:-translate-y-1.5"><RecentCard recent={fallbackRecent} /></div>
            </motion.div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32, ease: EASE }}
              className="absolute right-0 top-0"
            >
              <div className="transition-transform duration-300 hover:-translate-y-1.5"><WeekCard value={squadValue} workouts={squadWorkouts} /></div>
            </motion.div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.44, ease: EASE }}
              className="absolute bottom-2 right-10"
            >
              <div className="transition-transform duration-300 hover:-translate-y-1.5"><QuoteCard /></div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
