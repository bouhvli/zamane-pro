/**
 * pnpm icons (§9): generates the PWA icons into public/ for each logo, and copies the lockups the client uses into
 * src/client/assets/brand/ (assets/ stays read-only). Outputs are committed.
 *
 * Two logos (src/client/lib/logo.ts), chosen per device on the Profile page:
 *   classic  from assets/zamane-app-icon.svg            → public/ (the paths every install so far points at)
 *   tiles    from assets/New logo/zamane-tiles-app-icon.svg → public/icons/tiles/
 * Each set: favicon.ico, favicon.svg, apple-touch-icon-180x180.png, pwa-192x192.png, pwa-512x512.png,
 * maskable-icon-512x512.png. Also public/email/zamane-logo.png (the reset email, classic) and the light and dark
 * lockups of both logos in src/client/assets/brand/.
 * The maskable icon measures the drawing's bounding box and pads with the icon's own background colour until the
 * drawing sits inside the central 80% circle (the maskable safe zone).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "assets");
const SRC_TILES = join(SRC, "New logo");
const PUBLIC = join(ROOT, "public");
const BRAND = join(ROOT, "src/client/assets/brand");

const ICON_SETS = [
  { name: "classic", source: join(SRC, "zamane-app-icon.svg"), out: PUBLIC },
  { name: "tiles", source: join(SRC_TILES, "zamane-tiles-app-icon.svg"), out: join(PUBLIC, "icons/tiles") },
];
const LOCKUPS = [
  join(SRC, "zamane-logo.svg"),
  join(SRC, "zamane-logo-dark.svg"),
  join(SRC_TILES, "zamane-tiles-logo.svg"),
  join(SRC_TILES, "zamane-tiles-logo-dark.svg"),
];

type Rgb = { r: number; g: number; b: number };

/** Drops the embedded C2PA <metadata> block (about 10 KB per file). The drawing is untouched. */
function stripMetadata(svg: string): string {
  return svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, "").replace(/\s+xmlns:c2pa="[^"]*"/, "");
}

async function png(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/** An ICO holding PNG images (valid since Windows Vista; every current browser reads it). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((img, i) => {
    const o = i * 16;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, o);
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(img.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += img.data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

/** The icon's background (its top-left pixel), and the bounding box of every pixel that differs from it. */
async function drawingBox(svg: Buffer) {
  const size = 1024;
  const { data, info } = await sharp(svg).resize(size, size).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const bg: Rgb = { r: data[0]!, g: data[1]!, b: data[2]! };
  let minX = size,
    minY = size,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const d = Math.abs(data[i]! - bg.r) + Math.abs(data[i + 1]! - bg.g) + Math.abs(data[i + 2]! - bg.b);
      if (d > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { size, bg, minX, minY, maxX, maxY };
}

async function maskable(name: string, svg: Buffer, out: number): Promise<Buffer> {
  const b = await drawingBox(svg);
  const c = b.size / 2;
  // Farthest drawing corner from the centre, as a fraction of the icon size.
  const corners = [
    [b.minX, b.minY],
    [b.maxX, b.minY],
    [b.minX, b.maxY],
    [b.maxX, b.maxY],
  ] as const;
  const reach = Math.max(...corners.map(([x, y]) => Math.hypot(x - c, y - c))) / b.size;
  const safe = 0.4; // radius of the central 80% circle
  const scale = Math.min(1, safe / reach);
  const inner = Math.round(out * scale);
  const icon = await sharp(svg, { density: 300 }).resize(inner, inner).png().toBuffer();
  const pad = Math.round((out - inner) / 2);
  console.log(
    `${name} maskable: drawing reaches ${(reach * 100).toFixed(1)}% from centre → scaled to ${(scale * 100).toFixed(1)}%`,
  );
  return sharp({ create: { width: out, height: out, channels: 4, background: { ...b.bg, alpha: 1 } } })
    .composite([{ input: icon, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function iconSet(set: (typeof ICON_SETS)[number]) {
  mkdirSync(set.out, { recursive: true });
  const svg = stripMetadata(readFileSync(set.source, "utf8"));
  const icon = Buffer.from(svg);
  writeFileSync(join(set.out, "favicon.svg"), svg);
  writeFileSync(
    join(set.out, "favicon.ico"),
    ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(icon, size) })))),
  );
  writeFileSync(join(set.out, "apple-touch-icon-180x180.png"), await png(icon, 180));
  writeFileSync(join(set.out, "pwa-192x192.png"), await png(icon, 192));
  writeFileSync(join(set.out, "pwa-512x512.png"), await png(icon, 512));
  writeFileSync(join(set.out, "maskable-icon-512x512.png"), await maskable(set.name, icon, 512));
}

async function main() {
  mkdirSync(join(PUBLIC, "email"), { recursive: true });
  mkdirSync(BRAND, { recursive: true });

  for (const set of ICON_SETS) await iconSet(set);

  for (const file of LOCKUPS) {
    const name = basename(file);
    writeFileSync(join(BRAND, name), stripMetadata(readFileSync(file, "utf8")));
  }
  // Email clients drop SVG: the reset email uses a 2x PNG of the light lockup, 40 px tall.
  const logo = Buffer.from(stripMetadata(readFileSync(join(SRC, "zamane-logo.svg"), "utf8")));
  writeFileSync(
    join(PUBLIC, "email/zamane-logo.png"),
    await sharp(logo, { density: 300 }).resize({ height: 80 }).png({ compressionLevel: 9 }).toBuffer(),
  );
  console.log("icons written to public/, public/icons/tiles/ and src/client/assets/brand/");
}

await main();
