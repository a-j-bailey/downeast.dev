/**
 * Named scrollFactors for the Harbor camera. Single source of truth.
 *
 * This is a real Phaser camera. Do not emulate parallax by offsetting a
 * whole-canvas blit. Lights live on the scene root; they cannot sit in
 * Containers (Phaser lighting rule).
 */
export const SCROLL = {
  sky: 0,
  farShore: 0.15,
  water: 0.4,
  land: 1,
  actors: 1,
  foreground: 1.15,
} as const;

export type ScrollLayer = keyof typeof SCROLL;

/**
 * Draw order. Far-shore land sits in front of water so the horizon never
 * drowns. Land backing sits in front of water so the seawall/dirt join
 * cannot flash a water band.
 */
export const DEPTH = {
  sky: -100,
  stars: -41,
  sun: -40,
  moon: -39,
  clouds: -20,
  waterFill: 17,
  waterDeep: 18,
  waves: 19,
  water: 20,
  foam: 21,
  farShore: 22,
  farCottage: 23,
  lighthouse: 24,
  ferry: 25,
  landBack: 28,
  land: 30,
  shoreWash: 31,
  planks: 32,
  shoreFoam: 33,
  seawall: 34,
  seawallStairs: 35,
} as const;
