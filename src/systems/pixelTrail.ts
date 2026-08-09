/**
 * Ball trail: a continuous ribbon (MeshLine) carries path/speed, while discrete
 * pixel shards ride on top and die in hard steps — “quickly disintegrating.”
 */

/** MeshLine history depth (drei keeps `length * 10` points). */
export const RIBBON_TRAIL_LENGTH = 6

/** Trail prop width — readable from the gallery seat. */
export const RIBBON_TRAIL_WIDTH = 0.24

/** Ribbon path memory (seconds) → visible fraction of the MeshLine buffer. */
export const RIBBON_TRAIL_TIME_S = 0.42

/** Max metres of ribbon implied by the MeshLine buffer at full visibility. */
export const RIBBON_TRAIL_MAX_LENGTH_M = 7.5

/** Instanced shard pool. */
export const PIXEL_SHARD_COUNT = 28

/** Stamp a new shard after this travel (m). */
export const PIXEL_SHARD_STRIDE_M = 0.1

/**
 * Shard lifetime (ms). Short on purpose — they should crumble off the ribbon,
 * not replace it.
 */
export const PIXEL_SHARD_LIFETIME_MS = 150

/** Cube edge at birth (newest), metres. */
export const PIXEL_SHARD_BASE_SIZE = 0.1

/** Hard life bands for shard dissolve. */
export const PIXEL_SHARD_DISSOLVE_STEPS = 4

/** Extra size at peak hit-flash mix. */
export const PIXEL_SHARD_HIT_SIZE_BOOST = 0.9

/** How far shards drift off the path over their life (m/s scale). */
export const PIXEL_SHARD_DRIFT_SPEED = 0.55

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Fraction of the MeshLine buffer that should be visible for this speed.
 * Faster → longer ribbon (up to the buffer).
 */
export function ribbonTrailVisibleFraction(speedMs: number): number {
  const lengthM = Math.max(0, speedMs) * RIBBON_TRAIL_TIME_S
  return clamp01(lengthM / RIBBON_TRAIL_MAX_LENGTH_M)
}

/**
 * MeshLine attenuation: t=0 oldest tip, t=1 ball. Cuts the old end by speed,
 * keeps a smooth taper on the live ribbon (pixels handle the crunchy tip).
 */
export function ribbonTrailAttenuation(t: number, visibleFraction: number): number {
  const vis = Math.max(0.06, Math.min(1, visibleFraction))
  const cut = 1 - vis
  if (t < cut) return 0
  const u = (t - cut) / vis
  return 0.2 + 0.8 * u * u
}

/**
 * @param age01 - 0 = just spawned, 1 = dead
 * @param hitMix - hit-flash envelope × intensity
 */
export function pixelShardScale(age01: number, hitMix = 0): number {
  const life = 1 - clamp01(age01)
  const stepped = Math.floor(life * PIXEL_SHARD_DISSOLVE_STEPS) / PIXEL_SHARD_DISSOLVE_STEPS
  if (stepped <= 0) return 0
  const boost = 1 + PIXEL_SHARD_HIT_SIZE_BOOST * clamp01(hitMix)
  return PIXEL_SHARD_BASE_SIZE * stepped * boost
}

/**
 * Checkerboard cull that starts early so the tip looks like crumbling pixels.
 */
export function pixelShardAlive(age01: number, index: number): boolean {
  const a = clamp01(age01)
  if (a >= 1) return false
  // After ~35% life, every other shard dies; after ~70%, only 1/3 remain.
  if (a >= 0.7 && index % 3 !== 0) return false
  if (a >= 0.35 && index % 2 !== 0) return false
  return true
}

/** Age 0–1 from spawn timestamp. */
export function pixelShardAge01(bornAt: number, now: number, lifetimeMs = PIXEL_SHARD_LIFETIME_MS): number {
  if (lifetimeMs <= 0) return 1
  return clamp01((now - bornAt) / lifetimeMs)
}
