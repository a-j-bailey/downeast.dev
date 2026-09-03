/**
 * Viewport + world layout.
 *
 * Harbor rendering uses a world-space pixel coordinate system where sprite
 * bitmaps are drawn 1:1 (after an integer-ish ctx scale done in game.ts).
 *
 * We recompute the visible viewport on resize, and derive horizon/ground
 * positions from the viewport height (so full-bleed screens show more world
 * horizontally rather than letterboxing).
 */

export type Viewport = {
  w: number;
  h: number;
  /** Walkable ground line (bottom of player). */
  groundY: number;
  /** Water surface / wave strip top. */
  waterY: number;
};

/** Locked interior room asset size (do not change). */
export const ROOM_W = 320;
export const ROOM_H = 180;

/** Player sprite size from the approved manifest. */
export const PLAYER_W = 27;
export const PLAYER_H = 43;

/**
 * Fixed internal harbor view size.
 *
 * We render the world into this coordinate space, then game.ts maps it onto
 * the full-bleed canvas with an integer-ish ctx scale (no smoothing).
 *
 * This keeps the coffee interior asset size stable (320x180) while making
 * the overall composition tall enough (~360px) for the sky text overlay.
 */
export const VIEW_W = 640;
export const VIEW_H = 360;
export const WATER_Y = Math.floor(VIEW_H * 0.46);
export const GROUND_Y = Math.floor(VIEW_H * 0.55);

/**
 * Boat/dock range: these are world-x bounds in "harbor world pixels".
 * (Camera bounds are computed using viewport.w.)
 */
export const OCEAN_MIN = -720;

/**
 * Walk bounds in harbor world-x (independent of viewport width).
 * Keep this wide: the camera can follow and reveal more of the street.
 */
export const WALK_MIN = 80;
export const WALK_MAX = 640;

/** Harbor world width for camera clamping (walk mode). */
export const HARBOR_WORLD_MAX = 1200;

/** Boat mode world-x width (ocean continues left). */
export const OCEAN_WORLD_MAX = 200;

const WATER_RATIO = 0.46;
const GROUND_RATIO = 0.55;

export function computeViewport(viewportW: number, viewportH: number): Viewport {
  const w = Math.max(240, Math.floor(viewportW));
  const h = Math.max(180, Math.floor(viewportH));
  return {
    w,
    h,
    waterY: Math.floor(h * WATER_RATIO),
    groundY: Math.floor(h * GROUND_RATIO),
  };
}

/**
 * For existing code that assumes a single internal view.
 * (game.ts clamps using VIEW_W / WORLD_MAX.)
 */
export const WORLD_MAX = 1200;

