/**
 * American flag next to the leftmost village shack (Zoning Radar),
 * on the land side of the seawall — not on the pier.
 *
 * Wind: Open-Meteo `wind_speed_10m` (km/h) and `wind_direction_10m`
 * (meteorological, degrees FROM). Direction's east-west component chooses
 * flipX. Speed picks one of three cloth poses — limp, half-unfurled, or
 * full-out — each a slow ripple cycle. No lean / flap.
 *
 * Query overrides: `?wind=0|12|28&winddir=90` (km/h, degrees).
 */

import { PLACES } from "./layout";

export type WindSample = {
  speedKmh: number;
  directionDeg: number;
};

export type FlagWindState = "limp" | "medium" | "heavy";

export type FlagPose = {
  state: FlagWindState;
  frame: number;
  flipX: boolean;
};

export const FLAG_FRAMES: Record<FlagWindState, readonly string[]> = {
  limp: ["flag-limp-0", "flag-limp-1", "flag-limp-2"],
  medium: ["flag-half-0", "flag-half-1", "flag-half-2"],
  heavy: ["flag-full-0", "flag-full-1", "flag-full-2"],
};

export const FLAG_KEYS = [
  ...FLAG_FRAMES.limp,
  ...FLAG_FRAMES.medium,
  ...FLAG_FRAMES.heavy,
] as const;

/** Left of the trap stack beside shack-a; feet on the land / seawall line. */
export const FLAGPOLE_PLACE = PLACES.flagpole;

/** Below this, the cloth hangs. Inclusive of calm and a light air. */
export const LIMP_KMH = 5;
/** At or above this, the cloth flies straight out. */
export const HEAVY_KMH = 20;

const RIPPLE_FPS: Record<FlagWindState, number> = {
  limp: 0.4,
  medium: 1.5,
  heavy: 2.2,
};

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

export function flagWindState(speedKmh: number): FlagWindState {
  const speed = Math.max(0, speedKmh);
  if (speed < LIMP_KMH) {
    return "limp";
  }
  if (speed < HEAVY_KMH) {
    return "medium";
  }
  return "heavy";
}

function rippleFrame(state: FlagWindState, phase: number, speedKmh: number): number {
  const keys = FLAG_FRAMES[state];
  const n = keys.length;
  switch (state) {
    case "limp":
      if (speedKmh < 0.5) {
        return 0;
      }
      return Math.floor(phase * RIPPLE_FPS.limp) % n;
    case "medium":
      return Math.floor(phase * RIPPLE_FPS.medium) % n;
    case "heavy":
      return Math.floor(phase * RIPPLE_FPS.heavy) % n;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function flagPose(wind: WindSample, phase: number): FlagPose {
  const speed = Math.max(0, wind.speedKmh);
  const flipX = flagFliesLeft(wind.directionDeg);
  const state = flagWindState(speed);
  return {
    state,
    frame: rippleFrame(state, Math.max(0, phase), speed),
    flipX,
  };
}

export function flagTextureKey(pose: Pick<FlagPose, "state" | "frame">): string {
  const keys = FLAG_FRAMES[pose.state];
  const i = Math.max(0, Math.min(keys.length - 1, Math.floor(pose.frame)));
  return keys[i] ?? keys[0];
}

/** Default breeze when the forecast is missing — half-unfurled cloth. */
export const DEFAULT_WIND: WindSample = { speedKmh: 10, directionDeg: 240 };
