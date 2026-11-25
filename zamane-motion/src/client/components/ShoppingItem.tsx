import { useState } from 'react';
import { cx, haptic } from '../lib/motion';

type Partner = 'a' | 'b';

export interface ShoppingItemProps {
  name: string;
  quantity?: number;
  price?: number;
  /** Writes the price with the space's currency. Pass the app's formatMoney. */
  formatAmount?: (n: number) => string;
  notes?: string;
  addedBy?: { name: string; partner: Partner };
  boughtBy?: { name: string; partner: Partner };
  bought?: boolean;
  /** Controlled when provided; otherwise toggles itself. */
  onToggle?: (bought: boolean) => void;
}

/**
 * The design system's ShoppingItem, animated: the box pops and fills zellige, the check draws in,
 * and a line draws across the name. Nothing animates for items that were already bought on load.
 * Move the row to the Bought group a moment later (useLagged(bought, 650)) so the tick is seen.
 */
export function ShoppingItem({
  name,
  quantity,
  price,
  formatAmount = (n) => Math.round(n).toLocaleString('en-US'),
  notes,
  addedBy,
  boughtBy,
  bought = false,
  onToggle,
}: ShoppingItemProps) {
  const [own, setOwn] = useState(bought);
  const [touched, setTouched] = useState(false);
  const isBought = onToggle ? bought : own;
  const who = isBought ? boughtBy ?? addedBy : addedBy;

  const toggle = () => {
    setTouched(true);
    if (!isBought) haptic();
    if (onToggle) onToggle(!isBought);
    else setOwn(!isBought);
  };

  return (
    <div className={cx('zm-item', isBought && 'zm-item-bought')} data-animate={touched || undefined}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isBought}
        aria-label={`Mark ${name} as bought`}
        className="zm-check"
        onClick={toggle}
      >
        <svg className="zm-check-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>
      <div className="zm-item-main">
        <span className="zm-item-name">
          <span className="zm-item-text">
            {quantity && quantity !== 1 ? <span className="zm-item-qty">{quantity} × </span> : null}
            {name}
          </span>
        </span>
        {(who || notes) && (
          <span className="zm-item-sub">
            {who && (
              <span className={`zm-av zm-av-${who.partner} zm-av-sm`} aria-hidden="true">
                {who.name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span>
              {who ? `${isBought ? 'Bought' : 'Added'} by ${who.name}` : ''}
              {who && notes ? ' · ' : ''}
              {notes}
            </span>
          </span>
        )}
      </div>
      {price != null && <span className="zm-item-price">{formatAmount(price)}</span>}
    </div>
  );
}
