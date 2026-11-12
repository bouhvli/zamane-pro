import type { ImageAsset } from "../../../shared/schemas/goals.ts";
import type { TripView } from "../../../shared/schemas/trips.ts";
import { formatAmount } from "../../../shared/money.ts";
import { dayDiff, status, type Budget } from "../../../shared/trip-plan.ts";
import { plural } from "../../lib/goals.ts";
import { photoUrl } from "../../lib/uploads.ts";

/**
 * The Trips pieces the list, the detail and the form share (.ux-forge/trips shared.js: Z.doorway, Z.lightBand,
 * Z.budgetBar, Z.tally). Markup and class names are the prototype's, so the scoped CSS applies as drawn.
 */

export type TripDoorSize = "lead" | "tile" | "row" | "detail" | "form" | "thumb";

/** CSS box of each size, for the delivery URL (× device pixel ratio). The arch crop itself is CSS. */
const PX: Record<TripDoorSize, { w: number; h: number }> = {
  lead: { w: 480, h: 240 },
  tile: { w: 240, h: 192 },
  row: { w: 32, h: 40 },
  thumb: { w: 32, h: 40 },
  detail: { w: 360, h: 480 },
  form: { w: 360, h: 480 },
};

/** The doorway (Z.doorway): a cover in the arch, or the title's initial. Decorative: the title is always next to it. */
export function TripDoorway({
  title,
  cover,
  size,
  cloudName,
  src,
}: {
  title: string;
  cover: ImageAsset | null;
  size: TripDoorSize;
  /** Null when uploads are off: covers aren't shown. */
  cloudName: string | null;
  /** A local preview (the form, while a new cover uploads). */
  src?: string;
}) {
  const url = src ?? (cover && cloudName ? photoUrl(cloudName, cover, PX[size].w, PX[size].h) : null);
  return (
    <div className={`door door--${size}${url ? " has-photo" : ""}`} aria-hidden="true">
      {url ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <span className="door-initial">{title.trim().charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

/**
 * The light band (Z.lightBand): TripCountdown laid flat, the one saffron block on a screen. Read in order it says
 * "12 days to go · Next trip" (the numeral isn't aria-hidden). Past is sunken; an undated trip has none.
 */
export function LightBand({
  trip,
  today,
  lead = true,
  nights,
}: {
  trip: Pick<TripView, "startDate" | "endDate">;
  today: string;
  lead?: boolean;
  nights?: boolean;
}) {
  const s = status(trip, today);
  if (s.kind === "undated") return null;
  let count = "";
  let words: string;
  let kicker = "";
  if (s.kind === "upcoming") {
    if (s.days === 1) words = "Tomorrow";
    else {
      count = String(s.days);
      words = "days to go";
    }
    const n = trip.endDate && trip.startDate ? dayDiff(trip.startDate, trip.endDate) : 0;
    kicker =
      (lead ? "Next trip" : "") + (nights && n ? `${lead ? " · " : ""}${n} ${plural(n, "night", "nights")}` : "");
  } else if (s.kind === "now") {
    count = `Day ${s.day}`;
    words = `of ${s.total}`;
    kicker = s.last ? "Last day" : "Happening now";
  } else {
    words = s.ago === 1 ? "Ended yesterday" : `Ended ${s.ago} days ago`;
  }
  return (
    <p className={`light${s.kind === "past" ? " light--past" : ""}${s.kind === "now" ? " light--now" : ""}`}>
      {count && (
        <>
          <b className="light-count num">{count}</b>{" "}
        </>
      )}
      <span className="light-words">{words}</span>
      {kicker && (
        <>
          <span className="light-sep" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          <span className="light-kicker">{kicker}</span>
        </>
      )}
    </p>
  );
}

/**
 * The ink-and-pencil budget bar (Z.budgetBar): solid = plan costs, dashed = estimates of ideas not in the plan, an
 * ink mark at the budget; all danger when over. Nothing without a budget (a full bar would claim a limit that
 * isn't there). `role=progressbar` with the spoken value.
 */
export function BudgetBar({
  budget,
  currency,
  label = "Budget",
}: {
  budget: Budget;
  currency: string;
  label?: string;
}) {
  const b = budget;
  if (b.budget == null) return null;
  const mad = (n: number) => formatAmount(n, currency);
  const span = Math.max(b.planned, b.budget) || 1;
  const planPct = (b.plan / span) * 100;
  const ideaPct = (b.ideas / span) * 100;
  const markPct = (b.budget / span) * 100;
  const valueText = `${mad(b.planned)} planned${b.ideas ? `, of which about ${mad(b.ideas)} are ideas,` : ""} of ${mad(b.budget)}${
    b.over ? `, over by ${mad(b.over)}` : ""
  }`;
  const now = b.budget ? Math.min(100, Math.round((b.planned / b.budget) * 100)) : 100;
  return (
    <div
      className={`bbar${b.over ? " is-over" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={now}
      aria-valuetext={valueText}
    >
      <span className="bbar-ink" style={{ width: `${planPct.toFixed(2)}%` }} />
      {b.ideas > 0 && <span className="bbar-pencil" style={{ width: `max(12px,${ideaPct.toFixed(2)}%)` }} />}
      <span className="bbar-mark" style={{ insetInlineStart: `${markPct.toFixed(2)}%` }} />
    </div>
  );
}

/** The Prep zellige tiles (Z.tally): one per item, aria-hidden, nothing over 12. */
export function Tally({ done, total }: { done: number; total: number }) {
  if (!total || total > 12) return null;
  return (
    <span className="tally" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < done ? "on" : undefined} />
      ))}
    </span>
  );
}
