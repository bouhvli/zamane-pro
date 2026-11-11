/**
 * Money (§4.3, D15): integer minor units with an explicit ISO 4217 minor-unit table, never Intl's CLDR digits,
 * so a stored integer can't change meaning. No floats on any path.
 */
const MINOR_UNITS: Record<string, number> = {
  // 0 decimals
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  // 3 decimals
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  // 4 decimals
  CLF: 4,
  UYW: 4,
};

export function minorUnits(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

export function isCurrencyCode(s: string): boolean {
  return /^[A-Z]{3}$/.test(s);
}

/**
 * Parses what a person typed ("12,50", "1 234.5", "1.234,56") into minor units, or null when it isn't an amount.
 * With one kind of separator, a single separator followed by exactly three digits is read as thousands
 * (unless the currency has three decimals); otherwise it's the decimal separator.
 */
export function parseMoney(input: string, currency: string): number | null {
  const digits = minorUnits(currency);
  // Spaces (including no-break and narrow no-break spaces) and apostrophes group thousands.
  const s = input.trim().replace(/[\s\u00a0\u202f']/g, "");
  if (!/^(\d[\d.,]*|[.,]\d+)$/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let intPart: string;
  let fracPart = "";
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = Math.max(lastDot, lastComma);
    const thousandsSep = dec === lastDot ? "," : ".";
    const head = s.slice(0, dec);
    if (head.includes(dec === lastDot ? "." : ",")) return null;
    const groups = head.split(thousandsSep);
    if (!groups.slice(1).every((g) => g.length === 3)) return null;
    intPart = groups.join("");
    fracPart = s.slice(dec + 1);
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = s.split(sep);
    const last = parts[parts.length - 1]!;
    const thousands = parts.length > 2 || (last.length === 3 && digits !== 3 && parts[0] !== "");
    if (thousands) {
      if (!parts.slice(1).every((p) => p.length === 3) || parts[0] === "") return null;
      intPart = parts.join("");
    } else {
      intPart = parts[0] ?? "";
      fracPart = last;
    }
  } else {
    intPart = s;
  }
  if (intPart === "") intPart = "0";
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (fracPart.length > digits) return null;
  const minor = Number(intPart) * 10 ** digits + Number(fracPart.padEnd(digits, "0") || "0");
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

export function formatMoney(minor: number, currency: string, locale?: string): string {
  if (!Number.isSafeInteger(minor)) throw new RangeError("money must be a safe integer of minor units");
  const digits = minorUnits(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
}

/** Reads a Postgres bigint (string, number or bigint) into a safe JS number. */
export function toSafeMinor(v: string | number | bigint): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isSafeInteger(n)) throw new RangeError("money value outside the safe integer range");
  return n;
}

/**
 * The designs' amount style: grouped digits, decimals only when there are any, then the code ("20,250 MAD",
 * "500.5 MAD"). Digits come from the ISO table, never from Intl's currency data (D15, D47).
 */
export function formatAmount(minor: number, currency: string): string {
  if (!Number.isSafeInteger(minor)) throw new RangeError("money must be a safe integer of minor units");
  const digits = minorUnits(currency);
  const n = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(
    minor / 10 ** digits,
  );
  return `${n} ${currency}`;
}

/** The number alone, in the same style ("20,250"). */
export function formatAmountNumber(minor: number, currency: string): string {
  return formatAmount(minor, currency).replace(/\s+[A-Z]{3}$/, "");
}
