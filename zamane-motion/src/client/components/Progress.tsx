import { cx, useBecameTrue } from '../lib/motion';
import { Celebrate } from './motion/Celebrate';

export interface ProgressProps {
  value: number;
  /** Default 100. */
  max?: number;
  /** goal (default): turns zellige with "Done" at max · budget: turns danger with "Over by …" above max. */
  mode?: 'goal' | 'budget';
  label?: string;
  /** Overrides the right-hand text. */
  valueLabel?: string;
  showValue?: boolean;
  /** Writes an amount for "Over by …". Pass the app's formatMoney. */
  formatAmount?: (n: number) => string;
}

/**
 * The design system's Progress bar, animated:
 * the fill slides to its new width (never on first render), changes colour smoothly,
 * and a burst of stars plays at the end of the bar the moment a goal is reached.
 */
export function Progress({
  value,
  max = 100,
  mode = 'goal',
  label,
  valueLabel,
  showValue = true,
  formatAmount = (n) => Math.round(n).toLocaleString('en-US'),
}: ProgressProps) {
  const ratio = max > 0 ? value / max : 0;
  const over = mode === 'budget' && value > max;
  const done = mode !== 'budget' && ratio >= 1;
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const fire = useBecameTrue(done);
  const right = valueLabel ?? (over ? `Over by ${formatAmount(value - max)}` : done ? 'Done' : `${pct}%`);

  return (
    <div className={cx('zm-prog', done && 'zm-prog-done', over && 'zm-prog-over')}>
      {(label || showValue) && (
        <div className="zm-prog-head">
          <span>{label ?? ''}</span>
          {showValue && <span className="zm-num">{right}</span>}
        </div>
      )}
      <div className="zm-prog-bar">
        <div
          className="zm-prog-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label ?? 'Progress'}
        >
          <div className="zm-prog-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="zm-prog-burst" style={{ left: `${pct}%` }}>
          <Celebrate fire={fire} />
        </span>
      </div>
    </div>
  );
}
