/**
 * The Vercel Function entry (D56): the whole /api, one Node.js function. scripts/build-vercel.ts bundles this file
 * into .vercel/output/functions/api.func; the routes there send every /api/* request to it with its original URL.
 */
import { getRequestListener } from "@hono/node-server";
import app from "./index.ts";

export default getRequestListener(app.fetch);
