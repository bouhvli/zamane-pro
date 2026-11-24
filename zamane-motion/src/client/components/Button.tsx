import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cx, starPath } from '../lib/motion';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: majorelle fill, once per view · secondary (default): outlined · ghost: text only · danger: destructive */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  /** Full width (the bottom of a sheet). */
  block?: boolean;
  /**
   * idle (default) · loading: a turning zellige star, the button keeps its width and ignores taps ·
   * success: a check draws in (primary turns zellige). Set it back to idle after ~1 s.
   */
  status?: 'idle' | 'loading' | 'success';
}

const SPINNER = starPath(10);

/** The design system's Button, with its press, loading and success motion. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', block, status = 'idle', className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      disabled={disabled || status === 'loading'}
      aria-busy={status === 'loading' || undefined}
      data-status={status}
      className={cx('zm-btn', 'zm-pressable', `zm-btn-${variant}`, size === 'sm' && 'zm-btn-sm', block && 'zm-btn-block', className)}
    >
      <span className="zm-btn-label">{children}</span>
      <span className="zm-btn-spinner" aria-hidden="true">
        <svg viewBox="-12 -12 24 24">
          <path d={SPINNER} />
        </svg>
      </span>
      <span className="zm-btn-done" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </button>
  );
});
