import { WORLD_HEIGHT, WORLD_WIDTH } from "./view";

/** Ground line sits in the bottom third of the 270-tall design view. */
export const HORIZON_Y = 102;
export const WATER_SURFACE_Y = 116;
export const WATER_BOTTOM_Y = 186;
export const LAND_TOP_Y = 186;
export const LAND_BOTTOM_Y = WORLD_HEIGHT - 4;

/** Single walking lane. Walker Y is locked here. */
export const WALKER_Y = 228;

export const SPAWN = { x: 148, y: WALKER_Y };

export const PLACES = {
  pylon: { x: 72, y: LAND_TOP_Y },
  pier: { x: 108, y: LAND_TOP_Y + 8 },
  // Docked in front of the pier face (audit: x 96–110, y 168–176).
  boat: { x: 102, y: 172 },
  shackA: { x: 248, y: LAND_TOP_Y },
  shackB: { x: 338, y: LAND_TOP_Y },
  coffee: { x: 448, y: LAND_TOP_Y },
  lighthouse: { x: 390, y: 118 },
  signGithub: { x: 560, y: LAND_TOP_Y },
  signX: { x: 608, y: LAND_TOP_Y },
  kayak: { x: 690, y: LAND_TOP_Y - 2 },
  paddle: { x: 708, y: LAND_TOP_Y - 1 },
} as const;

export { WORLD_HEIGHT, WORLD_WIDTH };
