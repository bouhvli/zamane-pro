import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: 'sm' | 'md' | 'lg' | 'pill';
  className?: string;
  style?: CSSProperties;
}

/** A sand-coloured placeholder with a slow shimmer, shown while data loads. */
export function Skeleton({ width = '100%', height = 16, radius = 'sm', className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={className ? `zm-skeleton ${className}` : 'zm-skeleton'}
      style={{ width, height, borderRadius: `var(--radius-${radius})`, ...style }}
    />
  );
}

/** The shape of a GoalCard, for the goal list and Home while they load. */
export function GoalCardSkeleton() {
  return (
    <div className="zm-goal" aria-hidden="true">
      <Skeleton width={64} height={80} radius="lg" />
      <div className="zm-goal-body">
        <Skeleton width="55%" height={20} />
        <Skeleton width="70%" height={16} />
        <Skeleton height={8} />
        <Skeleton width="40%" height={12} />
      </div>
    </div>
  );
}
