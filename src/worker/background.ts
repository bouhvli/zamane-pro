import { waitUntil } from "@vercel/functions";

/**
 * Work that finishes after the response (email, Cloudinary cleanup, closing a database pool). On Vercel the
 * function is kept alive until it settles (`waitUntil`, D56); locally and in tests the promise simply runs.
 * Failures are the caller's to catch: this never fails the request.
 */
export function background(work: Promise<unknown>): void {
  waitUntil(work);
}
