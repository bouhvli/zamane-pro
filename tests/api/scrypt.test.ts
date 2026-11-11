import { hashPassword, verifyPassword } from "better-auth/crypto";
import { describe, expect, it } from "vitest";

/**
 * D3: Better Auth hashes with scrypt (N=16384, r=16) through Workers' node:crypto. This measures the cost inside
 * workerd. Local wall time is a stand-in for CPU time (nothing else runs); Workers Free allows 10 ms of CPU.
 */
describe("scrypt cost in workerd (D3)", () => {
  it("measures hash and verify", async () => {
    const runs = 5;
    const hashMs: number[] = [];
    const verifyMs: number[] = [];
    for (let i = 0; i < runs; i++) {
      let t = performance.now();
      const hash = await hashPassword(`measure-password-${i}`);
      hashMs.push(performance.now() - t);
      t = performance.now();
      expect(await verifyPassword({ hash, password: `measure-password-${i}` })).toBe(true);
      verifyMs.push(performance.now() - t);
    }
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    console.log(
      `[D3] scrypt in workerd: hash median ${median(hashMs).toFixed(1)} ms (${hashMs.map((m) => m.toFixed(0)).join(", ")}), ` +
        `verify median ${median(verifyMs).toFixed(1)} ms (${verifyMs.map((m) => m.toFixed(0)).join(", ")})`,
    );
    expect(hashMs.length).toBe(runs);
  });
});
