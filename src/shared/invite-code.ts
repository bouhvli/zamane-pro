/**
 * Invite codes (§12): 8 characters from an alphabet without 0, O, 1, I or L (31^8 ≈ 8.5 × 10^11),
 * shown as XXXX-XXXX, normalised on input for case, spaces and dashes.
 * The parser is the prototype's (auth-shared.js A.normCode): pasting a whole message picks the last code in it.
 */
export const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const INVITE_LENGTH = 8;

export type InviteCodeReason = "" | "empty" | "length" | "letters";
export interface ParsedInviteCode {
  /** The 8 canonical characters, or "" when not valid. */
  code: string;
  /** "K7QM-4XPA" when valid, otherwise the trimmed input. */
  display: string;
  ok: boolean;
  reason: InviteCodeReason;
}

function onlyAlphabet(s: string): boolean {
  for (const ch of s) if (!INVITE_ALPHABET.includes(ch)) return false;
  return true;
}

export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function parseInviteCode(raw: string | null | undefined): ParsedInviteCode {
  const input = String(raw ?? "");
  const s = input.normalize("NFKC").toUpperCase();
  const runs = s.match(/[A-Z0-9]{4}[\s-]?[A-Z0-9]{4}/g);
  let pick = "";
  if (runs) {
    for (let i = runs.length - 1; i >= 0; i--) {
      const c = runs[i]!.replace(/[\s-]/g, "");
      if (onlyAlphabet(c)) {
        pick = c;
        break;
      }
    }
  }
  if (!pick) pick = s.replace(/[\s\-._]/g, "");
  if (!pick) return { code: "", display: "", ok: false, reason: "empty" };
  if (pick.length !== INVITE_LENGTH) return { code: "", display: input.trim(), ok: false, reason: "length" };
  if (!onlyAlphabet(pick)) return { code: "", display: input.trim(), ok: false, reason: "letters" };
  return { code: pick, display: formatInviteCode(pick), ok: true, reason: "" };
}

/** A uniformly random code. Rejection sampling keeps every character equally likely (256 isn't a multiple of 31). */
export function generateInviteCode(
  random: (bytes: Uint8Array<ArrayBuffer>) => void = (b) => crypto.getRandomValues(b),
): string {
  const n = INVITE_ALPHABET.length;
  const limit = 256 - (256 % n);
  let out = "";
  const buf = new Uint8Array(16);
  while (out.length < INVITE_LENGTH) {
    random(buf);
    for (const byte of buf) {
      if (byte < limit) out += INVITE_ALPHABET[byte % n];
      if (out.length === INVITE_LENGTH) break;
    }
  }
  return out;
}
