import { describe, expect, it } from "vitest";
import { isComplete, nextCompletion, progressRatio } from "../../src/shared/completion.ts";
import { formatAmount } from "../../src/shared/money.ts";
import { localToday, nextTrip, shortDate, tripStatus } from "../../src/shared/trip-days.ts";

describe("completion", () => {
  it("money goals complete at the target, general goals at 100", () => {
    expect(isComplete("money", 1_999_999, 2_000_000)).toBe(false);
    expect(isComplete("money", 2_000_000, 2_000_000)).toBe(true);
    expect(isComplete("money", 2_500_000, 2_000_000)).toBe(true);
    expect(isComplete("general", 99, null)).toBe(false);
    expect(isComplete("general", 100, null)).toBe(true);
  });
  it("records crossing up, clears dropping back, and leaves the rest alone", () => {
    const now = new Date("2026-11-09T10:00:00Z");
    const open = { completedAt: null, completedBy: null };
    const done = { completedAt: new Date("2026-11-01T00:00:00Z"), completedBy: "u1" };
    expect(nextCompletion(open, true, "u2", now)).toEqual({ completedAt: now, completedBy: "u2" });
    expect(nextCompletion(done, false, "u2", now)).toEqual({ completedAt: null, completedBy: null });
    expect(nextCompletion(done, true, "u2", now)).toBeNull(); // stays done; keeps who and when
    expect(nextCompletion(open, false, "u2", now)).toBeNull();
  });
  it("orders by ratio", () => {
    expect(progressRatio("money", 1_425_000, 2_000_000)).toBeCloseTo(0.7125);
    expect(progressRatio("general", 60, null)).toBe(0.6);
    expect(progressRatio("money", 5_000, 0)).toBe(0);
  });
});

describe("trip days (device date, raw dates)", () => {
  it("counts days to go, the day of the trip, and days since", () => {
    expect(tripStatus("2026-11-21", "2026-11-25", "2026-11-09")).toEqual({ kind: "upcoming", daysUntil: 12 });
    expect(tripStatus("2026-11-08", "2026-11-12", "2026-11-09")).toEqual({ kind: "now", day: 2, totalDays: 5 });
    expect(tripStatus("2026-11-01", "2026-11-03", "2026-11-09")).toEqual({ kind: "past", daysAgo: 6 });
    expect(tripStatus(null, null, "2026-11-09")).toEqual({ kind: "unscheduled" });
  });
  it("ignores DST changes", () => {
    expect(tripStatus("2026-03-30", "2026-04-02", "2026-03-28")).toEqual({ kind: "upcoming", daysUntil: 2 });
  });
  it("picks the trip happening now, else the next one", () => {
    const trips = [
      { id: "later", startDate: "2026-12-20", endDate: "2026-12-24" },
      { id: "soon", startDate: "2026-11-21", endDate: "2026-11-25" },
      { id: "over", startDate: "2026-11-01", endDate: "2026-11-02" },
    ];
    expect(nextTrip(trips, "2026-11-09")?.id).toBe("soon");
    expect(nextTrip([...trips, { id: "now", startDate: "2026-11-08", endDate: "2026-11-12" }], "2026-11-09")?.id).toBe(
      "now",
    );
    expect(nextTrip([trips[2]!], "2026-11-09")).toBeNull();
  });
  it("formats dates as the designs do", () => {
    expect(shortDate("2026-11-21")).toBe("Sat 21 Nov");
    expect(localToday(new Date(2026, 10, 9, 23, 30))).toBe("2026-11-09");
  });
});

describe("formatAmount (the designs' style)", () => {
  it("groups, shows decimals only when there are any, then the code", () => {
    expect(formatAmount(2_025_000, "MAD")).toBe("20,250 MAD");
    expect(formatAmount(50_050, "MAD")).toBe("500.5 MAD");
    expect(formatAmount(0, "EUR")).toBe("0 EUR");
    expect(formatAmount(500, "JPY")).toBe("500 JPY");
    expect(formatAmount(1_234, "KWD")).toBe("1.234 KWD");
  });
});
