import { Hono } from "hono";
import { z } from "zod";
import {
  createEntrySchema,
  createItemSchema,
  createPlaceSchema,
  createTripSchema,
  doneSchema,
  moveItemSchema,
  scheduleSchema,
  updateEntrySchema,
  updateItemSchema,
  updatePlaceSchema,
  updateTripSchema,
} from "../../shared/schemas/trips.ts";
import { notFound } from "../errors.ts";
import { errorBody } from "../middleware/core.ts";
import { requireSpace, session } from "../middleware/session.ts";
import { destroyLater } from "../services/cloudinary.ts";
import {
  createEntry,
  createItem,
  createPlace,
  createTrip,
  deleteEntry,
  deleteItem,
  deletePlace,
  deleteTrip,
  getTripFull,
  listTrips,
  moveItem,
  schedulePlace,
  setEntryDone,
  setItemDone,
  updateEntry,
  updateItem,
  updatePlace,
  updateTrip,
} from "../services/trips.ts";
import type { AppEnv } from "../types.ts";
import { validate } from "../validate.ts";

const tripParam = z.object({ tripId: z.uuid() });
const entryParam = z.object({ tripId: z.uuid(), entryId: z.uuid() });
const placeParam = z.object({ tripId: z.uuid(), placeId: z.uuid() });
const itemParam = z.object({ tripId: z.uuid(), itemId: z.uuid() });

const CONFLICT_MESSAGE = "Your partner changed this while you were editing.";

/** /api/trips (§5, D59). Phase 5 broadcasts each write after commit. */
export const tripRoutes = new Hono<AppEnv>()
  .use("*", session, requireSpace)
  .get("/", async (c) => {
    c.header("Cache-Control", "no-store");
    const config = c.get("config");
    const images = config.uploadsEnabled ? { cloudName: config.CLOUDINARY_CLOUD_NAME } : null;
    return c.json({ ...(await listTrips(c, c.get("space").spaceId)), images });
  })
  .post("/", validate("json", createTripSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await createTrip(c, spaceId, userId, c.req.valid("json"));
    return c.json({ trip: r.trip }, r.status);
  })
  .get("/:tripId", validate("param", tripParam), async (c) => {
    const trip = await getTripFull(c, c.get("space").spaceId, c.req.valid("param").tripId);
    if (!trip) throw notFound();
    c.header("Cache-Control", "no-store");
    return c.json(trip);
  })
  .patch("/:tripId", validate("param", tripParam), validate("json", updateTripSchema), async (c) => {
    const r = await updateTrip(c, c.get("space").spaceId, c.req.valid("param").tripId, c.req.valid("json"));
    if (r.kind === "not_found") throw notFound();
    if (r.kind === "conflict") return c.json({ ...errorBody("conflict", CONFLICT_MESSAGE), current: r.current }, 409);
    if (r.oldCover) destroyLater(c.get("config"), [r.oldCover]);
    return c.json({ trip: r.trip });
  })
  .delete("/:tripId", validate("param", tripParam), async (c) => {
    const ids = await deleteTrip(c, c.get("space").spaceId, c.req.valid("param").tripId);
    if (ids) destroyLater(c.get("config"), ids);
    return c.body(null, 204);
  })

  // ----- plan -----
  .post("/:tripId/plan", validate("param", tripParam), validate("json", createEntrySchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await createEntry(c, spaceId, userId, c.req.valid("param").tripId, c.req.valid("json"));
    return c.json({ entry: r.entry }, r.status);
  })
  .patch("/:tripId/plan/:entryId", validate("param", entryParam), validate("json", updateEntrySchema), async (c) => {
    const { tripId, entryId } = c.req.valid("param");
    const r = await updateEntry(c, c.get("space").spaceId, tripId, entryId, c.req.valid("json"));
    if (r.kind === "not_found") throw notFound();
    if (r.kind === "conflict") return c.json({ ...errorBody("conflict", CONFLICT_MESSAGE), current: r.current }, 409);
    return c.json({ entry: r.entry });
  })
  .put("/:tripId/plan/:entryId/done", validate("param", entryParam), validate("json", doneSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const { tripId, entryId } = c.req.valid("param");
    const entry = await setEntryDone(c, spaceId, userId, tripId, entryId, c.req.valid("json").done);
    if (!entry) throw notFound();
    return c.json({ entry });
  })
  .delete("/:tripId/plan/:entryId", validate("param", entryParam), async (c) => {
    const { tripId, entryId } = c.req.valid("param");
    await deleteEntry(c, c.get("space").spaceId, tripId, entryId);
    return c.body(null, 204);
  })

  // ----- places -----
  .post("/:tripId/places", validate("param", tripParam), validate("json", createPlaceSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await createPlace(c, spaceId, userId, c.req.valid("param").tripId, c.req.valid("json"));
    return c.json({ place: r.place }, r.status);
  })
  .patch("/:tripId/places/:placeId", validate("param", placeParam), validate("json", updatePlaceSchema), async (c) => {
    const { tripId, placeId } = c.req.valid("param");
    const r = await updatePlace(c, c.get("space").spaceId, tripId, placeId, c.req.valid("json"));
    if (r.kind === "not_found") throw notFound();
    if (r.kind === "conflict") return c.json({ ...errorBody("conflict", CONFLICT_MESSAGE), current: r.current }, 409);
    return c.json({ place: r.place });
  })
  .delete("/:tripId/places/:placeId", validate("param", placeParam), async (c) => {
    const { tripId, placeId } = c.req.valid("param");
    await deletePlace(c, c.get("space").spaceId, tripId, placeId);
    return c.body(null, 204);
  })
  .post(
    "/:tripId/places/:placeId/schedule",
    validate("param", placeParam),
    validate("json", scheduleSchema),
    async (c) => {
      const { spaceId, userId } = c.get("space");
      const { tripId, placeId } = c.req.valid("param");
      const r = await schedulePlace(c, spaceId, userId, tripId, placeId, c.req.valid("json"));
      if (r.kind === "not_found") throw notFound();
      if (r.kind === "taken")
        return c.json({ ...errorBody("conflict", "This place is already in the plan."), entry: r.entry }, 409);
      return c.json({ entry: r.entry }, r.status);
    },
  )

  // ----- checklist -----
  .post("/:tripId/checklist", validate("param", tripParam), validate("json", createItemSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await createItem(c, spaceId, userId, c.req.valid("param").tripId, c.req.valid("json"));
    return c.json({ item: r.item }, r.status);
  })
  .patch("/:tripId/checklist/:itemId", validate("param", itemParam), validate("json", updateItemSchema), async (c) => {
    const { tripId, itemId } = c.req.valid("param");
    const r = await updateItem(c, c.get("space").spaceId, tripId, itemId, c.req.valid("json"));
    if (r.kind === "not_found") throw notFound();
    if (r.kind === "conflict") return c.json({ ...errorBody("conflict", CONFLICT_MESSAGE), current: r.current }, 409);
    return c.json({ item: r.item });
  })
  .put("/:tripId/checklist/:itemId/done", validate("param", itemParam), validate("json", doneSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const { tripId, itemId } = c.req.valid("param");
    const item = await setItemDone(c, spaceId, userId, tripId, itemId, c.req.valid("json").done);
    if (!item) throw notFound();
    return c.json({ item });
  })
  .post(
    "/:tripId/checklist/:itemId/move",
    validate("param", itemParam),
    validate("json", moveItemSchema),
    async (c) => {
      const { tripId, itemId } = c.req.valid("param");
      const items = await moveItem(c, c.get("space").spaceId, tripId, itemId, c.req.valid("json").direction);
      if (!items) throw notFound();
      return c.json({ items });
    },
  )
  .delete("/:tripId/checklist/:itemId", validate("param", itemParam), async (c) => {
    const { tripId, itemId } = c.req.valid("param");
    await deleteItem(c, c.get("space").spaceId, tripId, itemId);
    return c.body(null, 204);
  });
