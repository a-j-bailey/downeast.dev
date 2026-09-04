/**
 * American flag next to the leftmost village shack (Zoning Radar),
 * on the land side of the seawall — not on the pier.
 *
 * Wind: Open-Meteo `wind_speed_10m` (km/h) and `wind_direction_10m`
 * (meteorological, degrees FROM). Direction's east-west component chooses
 * flipX; speed chooses flap frame rate, lean, and limp vs flying.
 *
 * Query overrides: `?wind=25&winddir=90` (km/h, degrees).
 */

import { PLACES } from "./layout";

export type WindSample = {
  speedKmh: number;
  directionDeg: number;
};

export type FlagPose = {
  frame: number;
  leanDeg: number;
  flipX: boolean;
  limp: boolean;
};

export const FLAG_FRAME_COUNT = 4;
export const FLAG_KEYS = ["flag-0", "flag-1", "flag-2", "flag-3"] as const;

/** Left of the trap stack beside shack-a; feet on the land / seawall line. */
export const FLAGPOLE_PLACE = PLACES.flagpole;

const LIMP_KMH = 2.4;

export function windFromQuery(search: string): Partial<WindSample> | null {
  const q = new URLSearchParams(search);
  const speedRaw = q.get("wind");
  const dirRaw = q.get("winddir");
  if (speedRaw === null && dirRaw === null) {
    return null;
  }
  const out: Partial<WindSample> = {};
  if (speedRaw !== null) {
    const speed = Number.parseFloat(speedRaw);
    if (Number.isFinite(speed) && speed >= 0) {
      out.speedKmh = speed;
    }
  }
  if (dirRaw !== null) {
    const dir = Number.parseFloat(dirRaw);
    if (Number.isFinite(dir)) {
      out.directionDeg = ((dir % 360) + 360) % 360;
    }
  }
  return out;
}

/**
 * Meteorological direction is where the wind comes FROM.
 * Scene: left = seaward ≈ west, right = town ≈ east.
 * Eastward flow (from the west) → flag flies right.
 */
export function flagFliesLeft(directionDeg: number): boolean {
  const towardEast = -Math.sin((directionDeg * Math.PI) / 180);
  return towardEast < 0;
}

export function flagPose(wind: WindSample, phase: number): FlagPose {
  const speed = Math.max(0, wind.speedKmh);
  const flipX = flagFliesLeft(wind.directionDeg);
  if (speed < LIMP_KMH) {
    return { frame: 0, leanDeg: 0, flipX, limp: true };
  }

  const fps = 1.6 + Math.min(7, speed / 4.5);
  const cycle =
    speed < 10 ? [0, 1, 0, 1] : speed < 22 ? [1, 2, 1, 3] : [1, 2, 3, 2];
  const idx = Math.floor(phase * fps) % cycle.length;
  const frame = cycle[idx] ?? 1;
  const lean = Math.min(10, 2 + speed * 0.26);
  const leanDeg = Math.round(((flipX ? -1 : 1) * lean) / 2) * 2;
  return { frame, leanDeg, flipX, limp: false };
}

export function flagTextureKey(frame: number): string {
  const i = Math.max(0, Math.min(FLAG_FRAME_COUNT - 1, Math.floor(frame)));
  return FLAG_KEYS[i] ?? FLAG_KEYS[0];
}

/** Default breeze when the forecast is missing — flag still reads as cloth. */
export const DEFAULT_WIND: WindSample = { speedKmh: 10, directionDeg: 240 };
