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
  // Land side of the seawall, left of the trap pile beside shack-a.
  flagpole: { x: 164, y: LAND_TOP_Y },
  shackB: { x: 338, y: LAND_TOP_Y },
  coffee: { x: 448, y: LAND_TOP_Y },
  lighthouse: { x: 390, y: 118 },
  farCottageA: { x: 142, y: HORIZON_Y },
  farCottageB: { x: 262, y: HORIZON_Y },
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
/** Flagpole on the village street, left of the lobster traps. */
export const FLAGPOLE_DEPTH = LAND_TOP_Y + 10;

/**
 * Cormorant feet on the wood dock deck above the seaward (leftmost) pylon.
 * Dock sprite is 120×40, origin 0.5,1; deck top is 2px below the texture top.
 */
export const CORMORANT = {
  x: PLACES.dock.x - 44,
  y: PLACES.dock.y - 38,
} as const;

/**
 * boat.png is 171×51 with origin (0.5, 1).
 * Unflipped art faces LEFT: bow/stem on −X, green pennant and transom on +X.
 * Unsigned distances from that origin to the fixture in unflipped art.
 * Bow: stem tip (~px 1.5, 14). Stern: flagpole top (~px 158.5, 7), not the waterline.
 */
export const BOAT_BOW_X = 84;
export const BOAT_BOW_Y = -37;
export const BOAT_STERN_X = 73;
export const BOAT_STERN_Y = -44;

/** Phaser flipX mirrors left-facing boat art, so flipX means the hull faces right. */
export function boatFacingRight(boat: { flipX: boolean }): boolean {
  return boat.flipX;
}

export function boatBowOffsetX(facingRight: boolean): number {
  return facingRight ? BOAT_BOW_X : -BOAT_BOW_X;
}

export function boatSternOffsetX(facingRight: boolean): number {
  return facingRight ? -BOAT_STERN_X : BOAT_STERN_X;
}

export { WORLD_HEIGHT, WORLD_WIDTH, VIEW_HEIGHT };
