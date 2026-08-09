/**
 * Deterministic pseudo-random source for property tests.
 *
 * The tests were originally written with `seed = (seed * 1103515245 + 12345) & 0x7fffffff`
 * copied into each file. That looks like C's `rand`, but the product reaches about 2^61, well
 * past the 2^53 that a double holds exactly, so the low bits are lost to rounding before the
 * mask is applied. The measured period was around 10⁴ — short enough that a longer loop would
 * silently retest the same cases while appearing to sample thousands.
 *
 * xorshift32 stays inside 32-bit integer arithmetic, where every operation is exact, and has
 * a period of 2³² − 1.
 */
export function seededRandom(seed: number): () => number {
  // 0 is a fixed point for xorshift, so it cannot be used as a seed.
  let state = (seed | 0) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0x100000000
  }
}

/**
 * A generator of values in [-range, range).
 */
export function seededSpread(seed: number): (range: number) => number {
  const random = seededRandom(seed)
  return (range: number) => (random() - 0.5) * 2 * range
}
