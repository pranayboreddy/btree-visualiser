/** Small pure helpers for input parsing and read-cost maths. */

/** Parse and clamp a user-entered value to an integer in [0, 9999], or null. */
export function clampInt(v: string | number): number | null {
  const n = Math.round(Number(v));
  return Number.isNaN(n) ? null : Math.max(0, Math.min(9999, n));
}

/** A random key in [1, 999], avoiding values already present when possible. */
export function randKey(exclude?: Set<number>): number {
  for (let guard = 0; guard < 200; guard++) {
    const k = 1 + Math.floor(Math.random() * 999);
    if (!exclude || !exclude.has(k)) return k;
  }
  return 1 + Math.floor(Math.random() * 999);
}

/** Minimum branching factor t = ⌈order / 2⌉ for an order-m tree. */
export function minDegree(order: number): number {
  return Math.ceil(order / 2);
}

/** Worst-case read bound: ⌈log_t((n + 1) / 2)⌉ + 1. */
export function worstCaseReads(n: number, order: number): number {
  if (n <= 0) return 0;
  const t = Math.max(2, minDegree(order));
  return Math.ceil(Math.log((n + 1) / 2) / Math.log(t)) + 1;
}

/** Best-case read bound: ⌈log_order(n + 1)⌉ (a full, maximally-packed tree). */
export function bestCaseReads(n: number, order: number): number {
  if (n <= 0) return 0;
  return Math.ceil(Math.log(n + 1) / Math.log(Math.max(2, order)));
}
