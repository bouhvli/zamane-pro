import { useCountUp } from "../../lib/motion.ts";

/**
 * A number that counts to its new value when it changes: totals, amounts, percentages. At rest it is plain text (the
 * same text the element had before), so selectors and copy-paste see one value. While it counts, the moving figure is
 * hidden from screen readers and they get the final value only.
 */
export function AnimatedNumber({
  value,
  format,
  step = 1,
  ms,
}: {
  value: number;
  /** How the number is written: the app's formatAmount for amounts, `${n}%` for percentages. */
  format: (n: number) => string;
  /**
   * What the in-between figures round to, in the value's units. Amounts are in minor units: pass
   * 10 ** minorUnits(currency) so the count runs in whole dirhams (no cents flickering); the final value is exact.
   */
  step?: number;
  ms?: number;
}) {
  const { shown, counting } = useCountUp(value, ms);
  if (!counting) return <>{format(value)}</>;
  return (
    <>
      <span aria-hidden="true">{format(Math.round(shown / step) * step)}</span>
      <span className="vh">{format(value)}</span>
    </>
  );
}
