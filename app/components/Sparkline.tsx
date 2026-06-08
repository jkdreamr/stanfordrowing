import { sparklinePath } from '@/lib/stats';

interface SparklineProps {
  values: number[];
  className?: string;
  color?: string;
  height?: number;
}

/** Tiny inline activity trend line. */
export default function Sparkline({
  values,
  className = '',
  color = '#b51c00',
  height = 30,
}: SparklineProps) {
  const hasData = values.some((v) => v > 0);
  const path = sparklinePath(values, 100, height, 3);
  return (
    <svg
      className={`w-full ${className}`}
      style={{ height }}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {hasData ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <line
          x1="0"
          y1={height - 3}
          x2="100"
          y2={height - 3}
          stroke="#e1e3e4"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
