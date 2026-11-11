/**
 * pnpm env:init — adds the local keys that can be generated, without printing them:
 *   BETTER_AUTH_SECRET  32 random bytes, base64 (§10)
 * It only appends keys that are missing or empty; it never changes or prints an existing value.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(import.meta.dirname, "..", ".env");
const text = existsSync(file) ? readFileSync(file, "utf8") : "";
const has = (key: string) => new RegExp(`^${key}=\\s*\\S`, "m").test(text);

const additions: string[] = [];
if (!has("BETTER_AUTH_SECRET")) {
  const value = randomBytes(32).toString("base64");
  // An empty "BETTER_AUTH_SECRET=" line is replaced; otherwise the key is appended.
  if (/^BETTER_AUTH_SECRET=\s*$/m.test(text)) {
    writeFileSync(file, text.replace(/^BETTER_AUTH_SECRET=\s*$/m, `BETTER_AUTH_SECRET=${value}`));
    console.log("BETTER_AUTH_SECRET set in .env (value not shown).");
  } else additions.push(`BETTER_AUTH_SECRET=${value}`);
}

if (additions.length) {
  const sep = text === "" || text.endsWith("\n") ? "" : "\n";
  writeFileSync(file, `${text}${sep}\n# Added by pnpm env:init\n${additions.join("\n")}\n`);
  console.log(`Added to .env (values not shown): ${additions.map((a) => a.split("=")[0]).join(", ")}`);
} else if (has("BETTER_AUTH_SECRET")) {
  console.log("Nothing to add: BETTER_AUTH_SECRET is already set.");
}
