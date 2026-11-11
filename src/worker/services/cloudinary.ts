import { v7 as uuidv7 } from "uuid";
import { spacePrefix, stringToSign } from "../../shared/cloudinary.ts";
import type { ImageAsset, UploadSignature } from "../../shared/schemas/goals.ts";
import type { AppConfig } from "../env.ts";
import { ApiError } from "../errors.ts";

/**
 * Cloudinary (§8, D8). The server picks the public id and signs it with Web Crypto (SHA-256, sent as
 * signature_algorithm=sha256, checked against the account in Phase 6), so the phone can't write anywhere else.
 * Image bytes never touch the Worker.
 */
const ALLOWED_FORMATS = "jpg,png,webp";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function requireUploads(config: AppConfig) {
  if (!config.uploadsEnabled) throw new ApiError(503, "uploads_disabled", "Photos aren't available right now.");
}

export async function signUpload(config: AppConfig, spaceId: string, purpose: string): Promise<UploadSignature> {
  requireUploads(config);
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${spacePrefix(spaceId)}${purpose}/${uuidv7()}`;
  const params = { allowed_formats: ALLOWED_FORMATS, overwrite: "false", public_id: publicId, timestamp };
  const signature = await sha256Hex(stringToSign(params) + config.CLOUDINARY_API_SECRET);
  return {
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    signatureAlgorithm: "sha256",
    publicId,
    allowedFormats: ALLOWED_FORMATS,
    maxFileSize: MAX_FILE_SIZE,
  };
}

/** The asset must be one this space's signature produced. Anything else is refused on save. */
export function assertOwnAsset(spaceId: string, asset: ImageAsset | null | undefined) {
  if (asset && !asset.publicId.startsWith(spacePrefix(spaceId))) {
    throw new ApiError(400, "validation_failed", "That photo can't be used here.", {
      cover: "That photo can't be used here.",
    });
  }
}

/** Signed destroy of one asset. Failures are logged by name only; orphans are found by `pnpm images:orphans`. */
export async function destroyAsset(config: AppConfig, publicId: string): Promise<void> {
  if (!config.uploadsEnabled) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const signature = await sha256Hex(stringToSign(params) + config.CLOUDINARY_API_SECRET);
  const body = new FormData();
  body.set("public_id", publicId);
  body.set("timestamp", String(timestamp));
  body.set("api_key", config.CLOUDINARY_API_KEY);
  body.set("signature", signature);
  body.set("signature_algorithm", "sha256");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`cloudinary destroy answered ${res.status}`);
}

/** After commit, in waitUntil: a failure never fails the request. */
export function destroyLater(
  c: { executionCtx?: Pick<ExecutionContext, "waitUntil"> },
  config: AppConfig,
  publicIds: string[],
) {
  if (!publicIds.length || !config.uploadsEnabled) return;
  const work = Promise.all(
    publicIds.map((id) =>
      destroyAsset(config, id).catch((e: unknown) =>
        console.error(`cloudinary cleanup failed: ${e instanceof Error ? e.message : "unknown"}`),
      ),
    ),
  );
  try {
    c.executionCtx?.waitUntil(work);
  } catch {
    // No execution context (a script or test): the promise still runs.
  }
}
