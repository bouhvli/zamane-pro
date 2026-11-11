/**
 * pnpm icons (§9): generates the PWA icons into public/ from assets/zamane-app-icon.svg, and copies the logo
 * sources the client uses into src/client/assets/brand/ (assets/ stays read-only). Outputs are committed.
 *
 * Outputs:
 *   public/favicon.ico, favicon.svg, apple-touch-icon-180x180.png, pwa-192x192.png, pwa-512x512.png,
 *   maskable-icon-512x512.png, email/zamane-logo.png (for the reset email);
 *   src/client/assets/brand/zamane-logo.svg, zamane-logo-dark.svg.
 * The maskable icon measures the lettering's bounding box and pads with majorelle until the lettering sits inside
 * the central 80% circle (the maskable safe zone).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "assets");
const PUBLIC = join(ROOT, "public");
const BRAND = join(ROOT, "src/client/assets/brand");
const MAJORELLE = { r: 0x1d, g: 0x4e, b: 0x89, alpha: 1 };

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

/** Bounding box of every pixel that isn't the majorelle background, in a 1024 px render. */
async function letteringBox(svg: Buffer) {
  const size = 1024;
  const { data, info } = await sharp(svg).resize(size, size).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let minX = size,
    minY = size,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const d =
        Math.abs(data[i]! - MAJORELLE.r) + Math.abs(data[i + 1]! - MAJORELLE.g) + Math.abs(data[i + 2]! - MAJORELLE.b);
      if (d > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { size, minX, minY, maxX, maxY };
}

async function maskable(svg: Buffer, out: number): Promise<Buffer> {
  const b = await letteringBox(svg);
  const c = b.size / 2;
  // Farthest lettering corner from the centre, as a fraction of the icon size.
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
    `maskable: lettering reaches ${(reach * 100).toFixed(1)}% from centre → scaled to ${(scale * 100).toFixed(1)}%`,
  );
  return sharp({ create: { width: out, height: out, channels: 4, background: MAJORELLE } })
    .composite([{ input: icon, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  mkdirSync(PUBLIC, { recursive: true });
  mkdirSync(join(PUBLIC, "email"), { recursive: true });
  mkdirSync(BRAND, { recursive: true });

  const appIconSvg = stripMetadata(readFileSync(join(SRC, "zamane-app-icon.svg"), "utf8"));
  const appIcon = Buffer.from(appIconSvg);

  writeFileSync(join(PUBLIC, "favicon.svg"), appIconSvg);
  writeFileSync(
    join(PUBLIC, "favicon.ico"),
    ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(appIcon, size) })))),
  );
  writeFileSync(join(PUBLIC, "apple-touch-icon-180x180.png"), await png(appIcon, 180));
  writeFileSync(join(PUBLIC, "pwa-192x192.png"), await png(appIcon, 192));
  writeFileSync(join(PUBLIC, "pwa-512x512.png"), await png(appIcon, 512));
  writeFileSync(join(PUBLIC, "maskable-icon-512x512.png"), await maskable(appIcon, 512));

  for (const name of ["zamane-logo.svg", "zamane-logo-dark.svg"]) {
    writeFileSync(join(BRAND, name), stripMetadata(readFileSync(join(SRC, name), "utf8")));
  }
  // Email clients drop SVG: the reset email uses a 2x PNG of the light lockup, 40 px tall.
  const logo = Buffer.from(stripMetadata(readFileSync(join(SRC, "zamane-logo.svg"), "utf8")));
  writeFileSync(
    join(PUBLIC, "email/zamane-logo.png"),
    await sharp(logo, { density: 300 }).resize({ height: 80 }).png({ compressionLevel: 9 }).toBuffer(),
  );
  console.log("icons written to public/ and src/client/assets/brand/");
}

await main();
