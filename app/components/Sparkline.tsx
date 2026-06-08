import { sparklinePath } from '@/lib/stats';

interface SparklineProps {
  values: number[];
  className?: string;
  color?: string;
  height?: number;
}

export default function Sparkline({
  values,
  className = '',
  color = '#8c8680',
  height = 28,
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
          stroke="#d4cfc8"
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
