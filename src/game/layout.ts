import { VIEW_HEIGHT, WORLD_HEIGHT, WORLD_MAX_X, WORLD_MIN_X } from "./view";

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
/** Keel margin inside the seaward world edge. */
export const BOAT_OPEN_MIN_X = WORLD_MIN_X + 64;

export const PLACES = {
  // Light finger-dock seaward of the seawall; boat berths on its left.
  dock: { x: 36, y: BOAT_DOCK_Y - 18 },
  // Hull in the water just left of the dock; whole 171px sprite fits a 200-wide phone view.
  boat: { x: 44, y: BOAT_DOCK_Y },
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

/**
 * Halfway between the flagpole and the leftmost shack (Zoning Radar).
 * Flagpole origin is the pole; shack-a.png is 76×91 with origin (0.5, 1),
 * so this uses the left façade rather than the footprint center — the
 * open street between pole and building, still on WALKER_Y.
 */
const SHACK_A_WIDTH = 76;
export const SPAWN = {
  x: Math.round((PLACES.flagpole.x + PLACES.shackA.x - SHACK_A_WIDTH / 2) / 2),
  y: WALKER_Y,
};

/** Underway cannot pass the dock toward town. */
export const BOAT_DOCK_MAX_X = PLACES.boat.x;

/** First seawall tile center — locked to town, not the floating dock. */
export const SEAWALL_TILE_W = 142;
export const SEAWALL_ORIGIN_X = 166;
/** Left edge of the stone seawall — dark street/planks stop here. */
export const SEAWALL_LEFT_X = Math.round(SEAWALL_ORIGIN_X - SEAWALL_TILE_W / 2);
export const LAND_RIGHT_X = WORLD_MAX_X + 128;
export const LAND_BAND_W = LAND_RIGHT_X - SEAWALL_LEFT_X;
export const LAND_BAND_X = SEAWALL_LEFT_X + LAND_BAND_W / 2;
/** Walker stays on the light dock + town; open water is boat-only. */
export const WALKER_MIN_X = Math.round(PLACES.dock.x - 52);

/** Dock behind the walker so feet read on the light deck. */
export const DOCK_DEPTH = WALKER_Y - 16;
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

/** Cockpit from hull origin (0.5, 1). Unflipped cabin sits slightly bow-ward of center. */
export const BOAT_SEAT_X = 14;
export const BOAT_SEAT_Y = -20;
export const BOAT_PASSENGER_SCALE = 0.5;
export const WAKE_SPEED = 10;

export {
  VIEW_HEIGHT,
  WORLD_HEIGHT,
  WORLD_MAX_X,
  WORLD_MID_X,
  WORLD_MIN_X,
  WORLD_SPAN,
  WORLD_WIDTH,
} from "./view";
