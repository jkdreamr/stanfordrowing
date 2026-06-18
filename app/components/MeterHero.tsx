'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/** Meters with up to `decimals` places, comma-grouped, trailing zeros trimmed. */
function fmt(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);
}

const MAX_DECIMALS = 2;

/**
 * Feed hero for a distance (meters) value. Shows the decimals the rower logged
 * (a miles-converted run lands here as e.g. 4988.9664 → "4,988.97"), but trims
 * precision one place at a time if the number + unit would overflow onto a
 * second line. The displayed value rounds; scoring uses the exact stored value.
 */
export default function MeterHero({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [decimals, setDecimals] = useState(MAX_DECIMALS);

  // Start from full precision whenever the value changes.
  useLayoutEffect(() => {
    setDecimals(MAX_DECIMALS);
  }, [value]);

  // Drop a decimal place at a time until the row fits on one line.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth + 1 && decimals > 0) {
      setDecimals((d) => d - 1);
    }
  }, [decimals, value]);

  // Re-fit when the card resizes (rotation, breakpoint change).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setDecimals(MAX_DECIMALS));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-4 flex max-w-full items-end gap-2 overflow-hidden">
      <span className="whitespace-nowrap font-display text-[40px] xs:text-[46px] sm:text-[52px] font-bold leading-[0.9] tracking-tightest text-charcoal tabular">
        {fmt(value, decimals)}
      </span>
      <span className="shrink-0 pb-1 text-base font-medium text-charcoal-muted">m</span>
    </div>
  );
}
