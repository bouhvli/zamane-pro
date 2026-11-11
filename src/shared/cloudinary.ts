import type { ImageAsset } from "./schemas/goals.ts";

/**
 * Image delivery (§8): f_auto,q_auto,c_fill,g_auto at the needed width (× device pixel ratio), pinned to the
 * asset's version. The arch-shaped crop is CSS.
 */
export function imageUrl(cloudName: string, asset: ImageAsset, o: { w: number; h?: number; dpr?: number }): string {
  const dpr = Math.min(3, Math.max(1, Math.round((o.dpr ?? 1) * 2) / 2));
  const w = Math.round(o.w * dpr);
  const parts = ["f_auto", "q_auto", "c_fill", "g_auto", `w_${w}`];
  if (o.h) parts.push(`h_${Math.round(o.h * dpr)}`);
  return `https://res.cloudinary.com/${cloudName}/image/upload/${parts.join(",")}/v${asset.version}/${asset.publicId}`;
}

/** The space's folder: every public id the server signs starts with it (D8). */
export const spacePrefix = (spaceId: string) => `zamane/${spaceId}/`;

/** Cloudinary's string to sign: the parameters sorted by name, joined as k=v with "&". */
export function stringToSign(params: Record<string, string | number>): string {
  return Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}
