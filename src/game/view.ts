/** Logical design view. Extra world is shown on larger/wider screens. */
export const VIEW_WIDTH = 480;
export const VIEW_HEIGHT = 270;
/** Ultrawide framebuffer cap — height stays 270; extra width shows more harbor. */
export const VIEW_MAX_WIDTH = 960;

/**
 * Town/land lives in 0..WORLD_MAX_X. Open water extends seaward (left)
 * so the boat can leave the berth.
 */
export const WORLD_MIN_X = -720;
export const WORLD_MAX_X = 1920;
export const WORLD_WIDTH = WORLD_MAX_X;
export const WORLD_SPAN = WORLD_MAX_X - WORLD_MIN_X;
export const WORLD_MID_X = (WORLD_MIN_X + WORLD_MAX_X) / 2;
export const WORLD_HEIGHT = 270;
