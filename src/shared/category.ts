/**
 * Category normalisation (§4.3): NFKD, strip diacritics, lower-case, remove all whitespace.
 * "Fruit & Veg", "fruit &veg" and "Frúit & veg" share one key. An empty category has no key (grouped as "Other").
 */
export function categoryKey(category: string | null | undefined): string | null {
  if (category == null) return null;
  const key = category.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/gu, "");
  return key === "" ? null : key;
}
