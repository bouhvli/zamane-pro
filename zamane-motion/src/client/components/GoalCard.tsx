import { useEffect } from 'react';
import { cx, haptic, useBecameTrue } from '../lib/motion';
import { AnimatedNumber } from './motion/AnimatedNumber';
import { Progress } from './Progress';

type Partner = 'a' | 'b';

export interface GoalCardProps {
  title: string;
  /** money (default) uses saved/target; general uses percent. */
  kind?: 'money' | 'general';
  saved?: number;
  target?: number;
  percent?: number;
  /** Writes an amount with the space's currency. Pass the app's formatMoney. */
  formatAmount?: (n: number) => string;
  /** Already formatted, e.g. "by Sat 12 Jun". */
  deadlineLabel?: string;
  /** Image URL, shown in the arch. */
  cover?: string;
  lastBy?: { name: string; partner: Partner };
  /** e.g. "added 500 · 2 days ago". */
  lastActivity?: string;
  /** Makes the whole card tappable (opens the goal). */
  onOpen?: () => void;
  /** Shared-element name so the cover morphs into the goal screen's header (View Transitions). */
  transitionName?: string;
}

/**
 * The design system's GoalCard, animated:
 * the amount counts up and the bar slides when a contribution lands; at the target the bar
 * turns zellige, the "Done" badge pops in and stars burst from the end of the bar. With `onOpen`
 * the whole card is one tap target (the title is the button): it presses down, and lifts on hover on desktop.
 */
export function GoalCard({
  title,
  kind = 'money',
  saved = 0,
  target = 0,
  percent = 0,
  formatAmount = (n) => Math.round(n).toLocaleString('en-US'),
  deadlineLabel,
  cover,
  lastBy,
  lastActivity,
  onOpen,
  transitionName,
}: GoalCardProps) {
  const money = kind !== 'general';
  const value = money ? saved : percent;
  const max = money ? target : 100;
  const done = max > 0 && value >= max;
  const fire = useBecameTrue(done);

  useEffect(() => {
    if (fire) haptic(18);
  }, [fire]);

  return (
    <article className={cx('zm-goal', onOpen && 'zm-pressable zm-card-link')}>
      <div
        className={cx('zm-goal-cover', 'zm-arch', cover && 'has-img')}
        aria-hidden="true"
        style={transitionName ? { viewTransitionName: transitionName } : undefined}
      >
        {cover ? <img src={cover} alt="" /> : title.trim().charAt(0).toUpperCase()}
      </div>
      <div className="zm-goal-body">
        <div className="zm-goal-top">
          <h3 className="zm-goal-title">
            {onOpen ? (
              <button type="button" className="zm-goal-open" onClick={onOpen}>
                {title}
              </button>
            ) : (
              title
            )}
          </h3>
          {done && (
            <span key={fire} className={cx('zm-badge', 'zm-badge-done', fire > 0 && 'zm-pop')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Done
            </span>
          )}
        </div>
        <div className="zm-goal-amt zm-num">
          {money ? (
            <>
              <b>
                <AnimatedNumber value={saved} format={formatAmount} />
              </b>
              <span> of {formatAmount(target)}</span>
            </>
          ) : (
            <>
              <b>
                <AnimatedNumber value={percent} format={(n) => `${Math.round(n)}%`} />
              </b>
              <span> complete</span>
            </>
          )}
        </div>
        <Progress value={value} max={max} showValue={false} />
        <div className="zm-goal-foot">
          {lastBy ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className={`zm-av zm-av-${lastBy.partner} zm-av-sm`} aria-label={lastBy.name} role="img">
                {lastBy.name.trim().charAt(0).toUpperCase()}
              </span>
              {lastActivity}
            </span>
          ) : (
            <span />
          )}
          {deadlineLabel && <span>{deadlineLabel}</span>}
        </div>
      </div>
    </article>
  );
}
