/**
 * Visual comparison: the Goals list (.ux-forge/goals/goals.html#/goals, ?state=) next to the app's /goals with the
 * same example data mocked and the clock fixed to the prototype's "today". Writes tests/visual/report/goals-list/.
 */
import { type Case, visualSuite } from "./goals-harness.ts";

const LIST = "#/goals";
const cases: Case[] = [
  ...["populated", "empty", "all-done", "solo", "uploads-off"].map((s): Case => ({
    id: s,
    proto: `?state=${s}${LIST}`,
    state: s,
    path: "/goals",
    wide: true,
  })),
  {
    id: "loading",
    proto: `?state=loading${LIST}`,
    state: "populated",
    path: "/goals",
    wide: true,
    server: { listHangs: true },
  },
  {
    id: "error",
    proto: `?state=error${LIST}`,
    state: "populated",
    path: "/goals",
    wide: true,
    server: { listFails: true },
    ready: ".list-error",
  },
  {
    id: "offline",
    proto: `?state=offline${LIST}`,
    state: "populated",
    path: "/goals",
    wide: true,
    react: async (p) => {
      await p.waitForSelector(".tile");
      await p.context().setOffline(true);
      await p.waitForSelector(".list-notice");
    },
  },
];

visualSuite("goals-list", "Goals list", cases);
