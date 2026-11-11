import { imageUrl } from "../../shared/cloudinary.ts";
import type { ImageAsset, UploadSignature } from "../../shared/schemas/goals.ts";
import { GOAL_LIMITS, UPLOAD_PURPOSE } from "../../shared/schemas/goals.ts";
import { api } from "./api.ts";

/**
 * Photo uploads (§8, D8): the phone downscales to at most 2048 px on the long side and re-encodes as JPEG (which
 * also drops EXIF, location included), asks the Worker for a signature, then sends the bytes straight to
 * Cloudinary with progress. The Worker never sees image bytes; the saved asset is checked against the space's
 * folder when the goal or note is saved.
 */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_EDGE = 2048;
const QUALITY = 0.85;

export type UploadPurpose = (typeof UPLOAD_PURPOSE)[number];

export class UploadError extends Error {
  override name = "UploadError";
  constructor(
    readonly reason: "type" | "size" | "network" | "rejected" | "aborted" | "disabled",
    message: string,
  ) {
    super(message);
  }
}

/** The checks the designs make before anything is sent (form.js, composer.js). */
export function checkPhoto(file: File): "type" | "size" | null {
  if (!PHOTO_TYPES.includes(file.type)) return "type";
  if (file.size > GOAL_LIMITS.photoBytes) return "size";
  return null;
}

/** ≤ 2048 px, JPEG. Falls back to the original file when the browser can't decode it. */
export async function downscale(file: File): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    return file;
  }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
  return blob ?? file;
}

/**
 * Uploads one photo. `onProgress` gets 0..1 while the bytes go up. Abort with `signal`. Resolves to the asset as
 * stored on the goal or note.
 */
export async function uploadPhoto(
  file: File,
  purpose: UploadPurpose,
  o: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<ImageAsset> {
  const bad = checkPhoto(file);
  if (bad) throw new UploadError(bad, bad);
  const blob = await downscale(file);
  if (o.signal?.aborted) throw new UploadError("aborted", "aborted");
  let sig: UploadSignature;
  try {
    sig = await api<UploadSignature>("/api/uploads/sign", { body: { purpose }, signal: o.signal });
  } catch (e) {
    if (o.signal?.aborted) throw new UploadError("aborted", "aborted");
    const code = (e as { code?: string }).code;
    throw new UploadError(code === "uploads_disabled" ? "disabled" : "network", "sign failed");
  }
  const form = new FormData();
  form.set("file", blob, "photo.jpg");
  form.set("api_key", sig.apiKey);
  form.set("timestamp", String(sig.timestamp));
  form.set("signature", sig.signature);
  form.set("signature_algorithm", sig.signatureAlgorithm);
  form.set("public_id", sig.publicId);
  form.set("allowed_formats", sig.allowedFormats);
  form.set("overwrite", "false");

  return new Promise<ImageAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${encodeURIComponent(sig.cloudName)}/image/upload`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) o.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      const r = xhr.response as {
        public_id?: string;
        version?: number;
        width?: number;
        height?: number;
        format?: string;
      } | null;
      if (xhr.status >= 200 && xhr.status < 300 && r?.public_id && r.version && r.width && r.height && r.format) {
        o.onProgress?.(1);
        resolve({ publicId: r.public_id, version: r.version, width: r.width, height: r.height, format: r.format });
      } else reject(new UploadError("rejected", `upload answered ${xhr.status}`));
    };
    xhr.onerror = () => reject(new UploadError("network", "upload failed"));
    xhr.onabort = () => reject(new UploadError("aborted", "aborted"));
    o.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

/** A delivery URL at the device's pixel ratio (§8). */
export function photoUrl(cloudName: string, asset: ImageAsset, w: number, h?: number): string {
  return imageUrl(cloudName, asset, { w, h, dpr: typeof window === "undefined" ? 1 : window.devicePixelRatio });
}
