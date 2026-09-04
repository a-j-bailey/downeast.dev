/**
 * Shared harbor water clock. Shimmer, trap-buoys, and fenders all sample
 * the same sine so the dock reads as one body of water.
 *
 * Amplitude is small on purpose: 480×270 SNES diorama, not cartoon bounce.
 */

export type WaterBobber = {
  id: string;
  restY: number;
  seed: number;
  amp: number;
};

/** Matches HarborScene deep-water `sin(t * 1.1)`. */
export const WATER_BOB_FREQ = 1.1;

/** Fenders: ~1–2 px. */
export const FENDER_BOB_AMP = 1.35;

/** Trap buoy: ~2–3 px. */
export const BUOY_BOB_AMP = 2.45;

/** Spatial lag along the same wave so neighbors are not clones. */
export function bobSeedFromX(x: number): number {
  return x * 0.04;
}

/** Integer-pixel Y offset from the shared water phase. */
export function waterBobY(phase: number, seed: number, amplitudePx: number): number {
  return Math.round(Math.sin(phase * WATER_BOB_FREQ + seed) * amplitudePx);
}

export function bobberY(bobber: WaterBobber, phase: number): number {
  return bobber.restY + waterBobY(phase, bobber.seed, bobber.amp);
}
