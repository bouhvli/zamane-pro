import { useCountUp } from '../../lib/motion';

export interface AnimatedNumberProps {
  value: number;
  /** How the number is written. Pass the app's formatMoney for amounts. */
  format?: (n: number) => string;
  /** Count duration in ms. Default 700. */
  ms?: number;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * A number that counts to its new value when it changes: totals, amounts, days to go, items left.
 * Screen readers get the final value only, never the in-between ones.
 */
export function AnimatedNumber({ value, format = defaultFormat, ms, className }: AnimatedNumberProps) {
  const shown = useCountUp(value, ms);
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="zm-sr-only">{format(value)}</span>
    </span>
  );
}
