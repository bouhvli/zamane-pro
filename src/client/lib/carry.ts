/**
 * What travels between auth screens on this device (the prototype's A.carry): the email typed on Sign in reaches
 * Forgot and Create account, the "have a code" intent, a pending invite code and the join draft. Session storage
 * only, never the URL. Falls back to memory in a private window.
 */
type CarryKey = "email" | "intent" | "code" | "joinDraft";
const PREFIX = "zamane.auth.";
const mem: Partial<Record<CarryKey, string>> = {};

export const carry = {
  get(k: CarryKey): string {
    try {
      return sessionStorage.getItem(PREFIX + k) ?? "";
    } catch {
      return mem[k] ?? "";
    }
  },
  set(k: CarryKey, v: string) {
    mem[k] = v;
    try {
      sessionStorage.setItem(PREFIX + k, v);
    } catch {
      /* memory only */
    }
  },
  clear(k: CarryKey) {
    delete mem[k];
    try {
      sessionStorage.removeItem(PREFIX + k);
    } catch {
      /* memory only */
    }
  },
  clearAll() {
    (["email", "intent", "code", "joinDraft"] as const).forEach((k) => carry.clear(k));
  },
};

export const normEmail = (s: string) => s.trim().toLowerCase();
