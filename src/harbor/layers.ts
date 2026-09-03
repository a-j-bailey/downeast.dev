/**
 * Harbor draw stack. This file is the source of truth.
 * Docs and the Cursor skill must follow these names and factors.
 *
 * Never flatten the world into one background bitmap.
 * Sky / far / water scroll slower than the camera. Land and actors
 * share the walk plane (parallax 1). Foreground is the same plane,
 * drawn in front of the player so they pass behind signposts.
 */

export const LAYER = {
  sky: "sky",
  far: "far",
  water: "water",
  land: "land",
  actors: "actors",
  fg: "fg",
} as const;

export type LayerId = (typeof LAYER)[keyof typeof LAYER];

export type Layer = {
  id: LayerId;
  /** Camera multiply. 0 = pinned to the viewport, 1 = world space. */
  parallax: number;
  z: number;
};

export const LAYERS: Record<LayerId, Layer> = {
  sky: { id: LAYER.sky, parallax: 0.12, z: 0 },
  far: { id: LAYER.far, parallax: 0.34, z: 1 },
  water: { id: LAYER.water, parallax: 0.58, z: 2 },
  land: { id: LAYER.land, parallax: 1, z: 3 },
  actors: { id: LAYER.actors, parallax: 1, z: 4 },
  fg: { id: LAYER.fg, parallax: 1, z: 5 },
};

export const LAYER_ORDER: LayerId[] = [
  LAYER.sky,
  LAYER.far,
  LAYER.water,
  LAYER.land,
  LAYER.actors,
  LAYER.fg,
];
