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
 * Draw order. Sky, then far shore on the horizon, then water down to the
 * seawall, then land/buildings. Water must not drown far-coast pixels
 * (it starts at the surface, origin-top). Land backing sits in front of
 * water only from the dirt line down so the seawall seam cannot flash.
 */
export const DEPTH = {
  sky: -100,
  stars: -41,
  sun: -40,
  moon: -39,
  clouds: -20,
  farShore: 10,
  farCottage: 11,
  lighthouse: 12,
  ferry: 14,
  waterFill: 17,
  waterDeep: 18,
  waves: 19,
  water: 20,
  foam: 21,
  landBack: 28,
  land: 30,
  shoreWash: 31,
  planks: 32,
  shoreFoam: 33,
  seawall: 34,
  seawallStairs: 35,
} as const;
