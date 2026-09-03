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
  lighthouseBeam: 1,
  foreground: 1.15,
} as const;

export type ScrollLayer = keyof typeof SCROLL;
