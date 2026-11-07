// Small statistics helpers. Rates carry Wilson 95% intervals so small subgroups are not over-read.

/** A rate with its count and a Wilson 95% interval. */
export interface Rate {
  k: number;
  n: number;
  rate: number | null;
  ci95: [number, number] | null;
}

/** k of n, with a Wilson 95% interval; `rate` is null when n is 0. */
export function rate(k: number, n: number): Rate {
  if (n === 0) return { k, n, rate: null, ci95: null };
  const z = 1.96;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { k, n, rate: p, ci95: [Math.max(0, centre - half), Math.min(1, centre + half)] };
}

/** Quadratic weighted kappa between two integer ratings on 1..K; null with fewer than 2 pairs. */
export function quadraticKappa(pairs: readonly [number, number][], k: number): number | null {
  if (pairs.length < 2) return null;
  const O = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const ha = new Array<number>(k).fill(0);
  const hb = new Array<number>(k).fill(0);
  for (const [a, b] of pairs) {
    O[a - 1]![b - 1]! += 1;
    ha[a - 1]! += 1;
    hb[b - 1]! += 1;
  }
  let num = 0;
  let den = 0;
  const n = pairs.length;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const w = ((i - j) * (i - j)) / ((k - 1) * (k - 1));
      num += w * O[i]![j]!;
      den += (w * ha[i]! * hb[j]!) / n;
    }
  }
  return den === 0 ? null : 1 - num / den;
}

/** A seeded pseudo-random generator (mulberry32), for reproducible sampling. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded shuffle (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const r = seeded(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Up to `perGroup` items from each value of `group(item)` among `groups`, in seeded order. */
export function stratifiedSample<T>(items: readonly T[], group: (t: T) => string, groups: readonly string[], perGroup: number, seed: number): T[] {
  const shuffled = shuffle(items, seed);
  return groups.flatMap((g) => shuffled.filter((t) => group(t) === g).slice(0, perGroup));
}
