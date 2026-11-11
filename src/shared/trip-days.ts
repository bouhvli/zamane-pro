/**
 * Trip status from the device's local date (§4.3). The server returns raw `date` strings (YYYY-MM-DD); these
 * functions never shift them through a time zone.
 */
export type TripStatus =
  | { kind: "upcoming"; daysUntil: number }
  | { kind: "now"; day: number; totalDays: number }
  | { kind: "past"; daysAgo: number }
  | { kind: "unscheduled" };

const DAY = 86_400_000;

/** A calendar date as a UTC day number, so arithmetic ignores DST. */
function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / DAY;
}

/** Today on this device, as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function tripStatus(start: string | null, end: string | null, today: string): TripStatus {
  if (!start || !end) return { kind: "unscheduled" };
  const t = dayNumber(today);
  const s = dayNumber(start);
  const e = dayNumber(end);
  if (t < s) return { kind: "upcoming", daysUntil: s - t };
  if (t <= e) return { kind: "now", day: t - s + 1, totalDays: e - s + 1 };
  return { kind: "past", daysAgo: t - e };
}

/** The trip Home shows: the one happening now, else the next upcoming one. */
export function nextTrip<T extends { startDate: string | null; endDate: string | null }>(
  trips: T[],
  today: string,
): (T & { status: TripStatus }) | null {
  const withStatus = trips.map((t) => ({ ...t, status: tripStatus(t.startDate, t.endDate, today) }));
  const now = withStatus.find((t) => t.status.kind === "now");
  if (now) return now;
  const upcoming = withStatus
    .filter((t) => t.status.kind === "upcoming")
    .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1));
  return upcoming[0] ?? null;
}

/** "Sat 21 Nov", from a raw date, without time-zone shifts. */
export function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
