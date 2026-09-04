/**
 * Harbor celestial placement + sky tint from clock + solar elevation.
 *
 * Location matches Open-Meteo: 41.677°N, 71.266°W (Bristol, RI).
 *
 * Sun: NOAA / Wikipedia "Position of the Sun" low-order apparent longitude
 * (mean longitude + equation of center), then altitude/azimuth from
 * local hour angle. Good to ~0.01° — plenty for a 480px sky.
 *
 * Moon: first-order Meeus (mean longitude / anomaly / distance from node,
 * plus the main 6.289° / 5.128° terms). Typical error ~1–2°. Fine for a
 * night-sky disk; not an ephemeris.
 *
 * Screen mapping assumes a south-facing diorama (east = left, west = right):
 * dawn low on the left, noon high, dusk low on the right.
 */

import { HORIZON_Y } from "./layout";
import type { WeatherMood } from "./weather";

export const HARBOR_LAT = 41.677;
export const HARBOR_LON = -71.266;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type AltAz = {
  altitude: number;
  azimuth: number;
};

export type SkySpritePose = {
  x: number;
  y: number;
  visible: boolean;
  alpha: number;
};

export type SkyBodyState = {
  sun: AltAz;
  moon: AltAz;
  sunPose: SkySpritePose;
  moonPose: SkySpritePose;
  starsVisible: boolean;
  skyColor: number;
  ambientColor: number;
  isDark: boolean;
};

function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function wrap360(deg: number): number {
  const w = deg % 360;
  return w < 0 ? w + 360 : w;
}

function sind(d: number): number {
  return Math.sin(d * DEG);
}

function cosd(d: number): number {
  return Math.cos(d * DEG);
}

function equatorialToAltAz(
  raRad: number,
  decRad: number,
  date: Date,
  lat: number,
  lon: number,
): AltAz {
  const n = julianDate(date) - 2451545;
  // Greenwich mean sidereal time (hours), then local sidereal time.
  const gmstHours = (18.697374558 + 24.06570982441908 * n) % 24;
  const lstHours = (((gmstHours + lon / 15) % 24) + 24) % 24;
  const ha = lstHours * 15 * DEG - raRad;
  const latR = lat * DEG;
  const sinAlt =
    Math.sin(latR) * Math.sin(decRad) + Math.cos(latR) * Math.cos(decRad) * Math.cos(ha);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
  const azY = Math.sin(ha);
  const azX = Math.cos(ha) * Math.sin(latR) - Math.tan(decRad) * Math.cos(latR);
  const azimuth = wrap360(Math.atan2(azY, azX) * RAD + 180);
  return { altitude, azimuth };
}

/** Apparent solar altitude (deg) and azimuth from north, clockwise. */
export function solarAltAz(
  date: Date,
  lat = HARBOR_LAT,
  lon = HARBOR_LON,
): AltAz {
  const n = julianDate(date) - 2451545;
  const L = wrap360(280.46 + 0.9856474 * n);
  const g = wrap360(357.528 + 0.9856003 * n);
  const lambda = wrap360(L + 1.915 * sind(g) + 0.02 * sind(2 * g));
  const epsilon = 23.439 - 0.00000036 * n;
  const ra = Math.atan2(cosd(epsilon) * sind(lambda), cosd(lambda));
  const dec = Math.asin(Math.max(-1, Math.min(1, sind(epsilon) * sind(lambda))));
  return equatorialToAltAz(ra, dec, date, lat, lon);
}

/**
 * Simplified lunar alt/az. Meeus-style mean elements with the two largest
 * periodic terms. Not a full ELP/Meeus ch.47 series.
 */
export function lunarAltAz(
  date: Date,
  lat = HARBOR_LAT,
  lon = HARBOR_LON,
): AltAz {
  const n = julianDate(date) - 2451545;
  const L = wrap360(218.316 + 13.176396 * n);
  const M = wrap360(134.963 + 13.064993 * n);
  const F = wrap360(93.272 + 13.22935 * n);
  const lambda = wrap360(L + 6.289 * sind(M));
  const beta = 5.128 * sind(F);
  const epsilon = 23.439 - 0.00000036 * n;
  const ra = Math.atan2(
    sind(lambda) * cosd(epsilon) - tand(beta) * sind(epsilon),
    cosd(lambda),
  );
  const dec = Math.asin(
    Math.max(
      -1,
      Math.min(1, sind(beta) * cosd(epsilon) + cosd(beta) * sind(epsilon) * sind(lambda)),
    ),
  );
  return equatorialToAltAz(ra, dec, date, lat, lon);
}

function tand(d: number): number {
  return Math.tan(d * DEG);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpChannel(a: number, b: number, t: number, shift: number): number {
  const ca = (a >> shift) & 0xff;
  const cb = (b >> shift) & 0xff;
  return Math.round(lerp(ca, cb, t));
}

export function lerpColor(a: number, b: number, t: number): number {
  const u = Math.max(0, Math.min(1, t));
  const r = lerpChannel(a, b, u, 16);
  const g = lerpChannel(a, b, u, 8);
  const bl = lerpChannel(a, b, u, 0);
  return (r << 16) | (g << 8) | bl;
}

export function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

type ColorStop = { alt: number; sky: number; ambient: number };

/**
 * Light2D multiplies sprite RGB by ambient. Midday must sit near cream-white
 * or opaque art reads as overcast-night. Night / dusk / golden hour stay dim.
 */
export const DAY_AMBIENT = 0xe8e4d8;

/** Solar-elevation ramp. Golden hour uses Flexoki cream / orange warmth. */
const SOLAR_STOPS: ColorStop[] = [
  { alt: -18, sky: 0x0c1018, ambient: 0x1a2030 },
  { alt: -12, sky: 0x141a2c, ambient: 0x243044 },
  { alt: -6, sky: 0x2a2448, ambient: 0x3a3858 },
  { alt: -0.8, sky: 0x6a3a58, ambient: 0x6a4860 },
  { alt: 2, sky: 0xd4a070, ambient: 0xc4a078 },
  { alt: 6, sky: 0xe8c4a0, ambient: 0xe0d4c0 },
  { alt: 14, sky: 0x7aa8c8, ambient: 0xe4ddd0 },
  { alt: 28, sky: 0x5b93c5, ambient: DAY_AMBIENT },
];

function rampSolar(altitude: number): { sky: number; ambient: number } {
  const stops = SOLAR_STOPS;
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) {
    return { sky: 0x5b93c5, ambient: DAY_AMBIENT };
  }
  if (altitude <= first.alt) {
    return { sky: first.sky, ambient: first.ambient };
  }
  if (altitude >= last.alt) {
    return { sky: last.sky, ambient: last.ambient };
  }
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (!a || !b) {
      continue;
    }
    if (altitude >= a.alt && altitude <= b.alt) {
      const t = (altitude - a.alt) / (b.alt - a.alt);
      return {
        sky: lerpColor(a.sky, b.sky, t),
        ambient: lerpColor(a.ambient, b.ambient, t),
      };
    }
  }
  return { sky: last.sky, ambient: last.ambient };
}

function mixWeather(
  solar: { sky: number; ambient: number },
  mood: WeatherMood,
): { sky: number; ambient: number } {
  switch (mood) {
    case "clearDay":
      return solar;
    case "overcast":
      return {
        sky: lerpColor(solar.sky, 0x6d7784, 0.55),
        ambient: lerpColor(solar.ambient, 0x667788, 0.55),
      };
    case "rain":
      return {
        sky: lerpColor(solar.sky, 0x4f5b68, 0.65),
        ambient: lerpColor(solar.ambient, 0x556677, 0.6),
      };
    case "fog":
      return {
        sky: lerpColor(solar.sky, 0x8a9096, 0.6),
        ambient: lerpColor(solar.ambient, 0x889099, 0.55),
      };
    case "night":
      return {
        sky: lerpColor(solar.sky, 0x0e1624, 0.85),
        ambient: lerpColor(solar.ambient, 0x2a3348, 0.8),
      };
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}

export function isDarkOut(sunAltitude: number, mood: WeatherMood): boolean {
  return mood === "night" || sunAltitude < -0.5;
}

const HORIZON_PAD = 22;
const ZENITH_Y = 18;
/** Upper limb roughly on the horizon. */
const SUN_DISK = -0.83;
/** Civil twilight — stars after this. */
const STAR_ALT = -6;

/**
 * Project alt/az onto the sky layer (scrollFactor 0). Azimuth 90° (east)
 * is the left horizon; 270° (west) is the right. Altitude 0 sits just
 * above HORIZON_Y; 90° is near the top of the 270-tall view.
 */
export function projectSky(
  body: AltAz,
  viewW: number,
): { x: number; y: number } {
  const u = Math.max(0, Math.min(1, (body.azimuth - 90) / 180));
  // Pull noon left of the DOM wordmark; dawn/dusk stay on the horizons.
  const noonBias = -0.16 * Math.sin(u * Math.PI);
  const x = Math.round(
    HORIZON_PAD + (u + noonBias) * (viewW - HORIZON_PAD * 2),
  );
  const rise = Math.sin(Math.max(0, body.altitude) * DEG);
  const y = Math.round(HORIZON_Y - 8 - (HORIZON_Y - 8 - ZENITH_Y) * rise);
  return { x, y };
}

function sunAlpha(mood: WeatherMood): number {
  switch (mood) {
    case "clearDay":
      return 1;
    case "overcast":
      return 0.32;
    case "rain":
      return 0.28;
    case "fog":
      return 0.18;
    case "night":
      return 0;
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}

export function skyState(now: Date, viewW: number, mood: WeatherMood): SkyBodyState {
  const sun = solarAltAz(now);
  const moon = lunarAltAz(now);
  const colors = mixWeather(rampSolar(sun.altitude), mood);
  const dark = isDarkOut(sun.altitude, mood);
  const sunUp = sun.altitude > SUN_DISK && mood !== "night";
  const moonUp =
    moon.altitude > SUN_DISK && (sun.altitude < -0.5 || mood === "night");
  const sunPos = projectSky(sun, viewW);
  const moonPos = projectSky(moon, viewW);
  const twilight = Math.max(0, Math.min(1, (-sun.altitude - 0.5) / 8));

  return {
    sun,
    moon,
    sunPose: {
      x: sunPos.x,
      y: sunPos.y,
      visible: sunUp,
      alpha: sunUp ? sunAlpha(mood) : 0,
    },
    moonPose: {
      x: moonPos.x,
      y: moonPos.y,
      visible: moonUp,
      alpha: moonUp ? 0.55 + 0.4 * twilight : 0,
    },
    starsVisible: sun.altitude < STAR_ALT || mood === "night",
    skyColor: colors.sky,
    ambientColor: colors.ambient,
    isDark: dark,
  };
}
