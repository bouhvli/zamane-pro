import { Hono } from "hono";
import { z } from "zod";
import { boughtSchema, createItemSchema, restoreSchema, updateItemSchema } from "../../shared/schemas/shopping.ts";
import { notFound } from "../errors.ts";
import { errorBody } from "../middleware/core.ts";
import { requireSpace, session } from "../middleware/session.ts";
import {
  clearBought,
  createItem,
  deleteItem,
  listCategories,
  listShopping,
  restoreItems,
  setBought,
  updateItem,
} from "../services/shopping.ts";
import type { AppEnv } from "../types.ts";
import { validate } from "../validate.ts";

const itemParam = z.object({ itemId: z.uuid() });

/** /api/shopping (§5, D62). Phase 5 broadcasts each write after commit. */
export const shoppingRoutes = new Hono<AppEnv>()
  .use("*", session, requireSpace)
  .get("/", async (c) => {
    c.header("Cache-Control", "no-store");
    return c.json(await listShopping(c, c.get("space").spaceId));
  })
  .get("/categories", async (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ categories: await listCategories(c, c.get("space").spaceId) });
  })
  .post("/", validate("json", createItemSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await createItem(c, spaceId, userId, c.req.valid("json"));
    return c.json({ item: r.item }, r.status);
  })
  .post("/clear-bought", async (c) => {
    return c.json({ items: await clearBought(c, c.get("space").spaceId) });
  })
  .post("/restore", validate("json", restoreSchema), async (c) => {
    return c.json({ items: await restoreItems(c, c.get("space").spaceId, c.req.valid("json")) });
  })
  .patch("/:itemId", validate("param", itemParam), validate("json", updateItemSchema), async (c) => {
    const r = await updateItem(c, c.get("space").spaceId, c.req.valid("param").itemId, c.req.valid("json"));
    if (r.kind === "not_found") throw notFound();
    if (r.kind === "conflict")
      return c.json(
        { ...errorBody("conflict", "Your partner changed this while you were editing."), current: r.current },
        409,
      );
    return c.json({ item: r.item });
  })
  .put("/:itemId/bought", validate("param", itemParam), validate("json", boughtSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const item = await setBought(c, spaceId, userId, c.req.valid("param").itemId, c.req.valid("json").bought);
    if (!item) throw notFound();
    return c.json({ item });
  })
  .delete("/:itemId", validate("param", itemParam), async (c) => {
    await deleteItem(c, c.get("space").spaceId, c.req.valid("param").itemId);
    return c.body(null, 204);
  });
