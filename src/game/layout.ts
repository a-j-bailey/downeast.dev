import { VIEW_HEIGHT, WORLD_HEIGHT, WORLD_WIDTH } from "./view";

/** Ground line sits in the bottom third of the 270-tall design view. */
export const HORIZON_Y = 102;
/** Water top meets far-shore baseline. Live tide eases this by a few pixels (see tide.ts). */
export const WATER_SURFACE_Y = 102;
export const WATER_BOTTOM_Y = 186;
export const LAND_TOP_Y = 186;
export const LAND_BOTTOM_Y = WORLD_HEIGHT - 4;

/** Single walking lane. Walker Y is locked here. */
export const WALKER_Y = 228;

/**
 * Docked hull sits on the bottom edge of the design view (origin 0.5,1).
 * VIEW_HEIGHT - 4 keeps a couple px of margin under the keel.
 */
export const BOAT_DOCK_Y = VIEW_HEIGHT - 4;

/** Underway may ease up into open water a bit; not glued to dock Y. */
export const BOAT_OPEN_MIN_Y = WATER_SURFACE_Y + 48;
export const BOAT_OPEN_MAX_Y = BOAT_DOCK_Y;
export const BOAT_OPEN_MIN_X = 60;

export const SPAWN = { x: 148, y: WALKER_Y };

export const PLACES = {
  // Wood finger-dock midground; boat docks in front at bottom edge.
  dock: { x: 96, y: BOAT_DOCK_Y - 18 },
  // Foreground of the wood dock; hull near bottom of screen.
  boat: { x: 98, y: BOAT_DOCK_Y },
  shackA: { x: 248, y: LAND_TOP_Y },
  shackB: { x: 338, y: LAND_TOP_Y },
  coffee: { x: 448, y: LAND_TOP_Y },
  lighthouse: { x: 390, y: 118 },
  signGithub: { x: 560, y: LAND_TOP_Y },
  signX: { x: 608, y: LAND_TOP_Y },
  // Kayak is the Weather Otter interact; paddle is dressing only.
  kayak: { x: 690, y: LAND_TOP_Y - 2 },
  paddle: { x: 708, y: LAND_TOP_Y - 1 },
} as const;

/** Underway cannot pass the dock toward town. */
export const BOAT_DOCK_MAX_X = PLACES.boat.x;

/** Boat in front of wood dock midground. */
export const DOCK_DEPTH = BOAT_DOCK_Y - 10;
export const BOAT_DEPTH = BOAT_DOCK_Y + 20;

/** boat.png 171×51 origin 0.5,1 — bow tip / transom top. */
export const BOAT_BOW_X = 84;
export const BOAT_BOW_Y = -8;
export const BOAT_STERN_X = 84;
export const BOAT_STERN_Y = -34;

export { WORLD_HEIGHT, WORLD_WIDTH, VIEW_HEIGHT };
