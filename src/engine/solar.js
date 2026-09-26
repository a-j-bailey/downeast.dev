/**
 * Sun / moon position for East Passage (Bristol, Rhode Island).
 * Compact NOAA-style solar + Meeus-lite lunar. Degrees unless noted.
 */
import { clamp, lerp } from "./core.js";

export const EAST_PASSAGE = {
  lat: 41.677,
  lon: -71.276,
  tz: "America/New_York",
};

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const TAGLINE = {
  night: "Fog on the harbor",
  dawn: "Dawn on the harbor",
  day: "Day on the harbor",
  dusk: "Dusk on the harbor",
};

function julian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function sind(d) {
  return Math.sin(d * D2R);
}
function cosd(d) {
  return Math.cos(d * D2R);
}

function wrap360(d) {
  return ((d % 360) + 360) % 360;
}

/** Equatorial → altitude / azimuth (0° north, clockwise) at lat/lon. */
function altAz(raHours, decDeg, lat, lon, date) {
  const jd = julian(date);
  const n = jd - 2451545.0;
  const gmst = wrap360(280.46061837 + 360.98564736629 * n);
  const lst = wrap360(gmst + lon);
  const ha = wrap360(lst - raHours * 15);
  const sinAlt = sind(lat) * sind(decDeg) + cosd(lat) * cosd(decDeg) * cosd(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1)) * R2D;
  const y = sind(ha) * cosd(decDeg);
  const x = cosd(lat) * sind(decDeg) - sind(lat) * cosd(decDeg) * cosd(ha);
  const az = wrap360(-(Math.atan2(y, x) * R2D));
  return { alt, az };
}

export function sunPosition(date, lat = EAST_PASSAGE.lat, lon = EAST_PASSAGE.lon) {
  const n = julian(date) - 2451545.0;
  const L = wrap360(280.46 + 0.98564736 * n);
  const g = wrap360(357.528 + 0.98560028 * n);
  const lambda = wrap360(L + 1.915 * sind(g) + 0.02 * sind(2 * g));
  const eps = 23.439 - 0.00000036 * n;
  const ra = Math.atan2(cosd(eps) * sind(lambda), cosd(lambda)) * R2D;
  const dec = Math.asin(clamp(sind(eps) * sind(lambda), -1, 1)) * R2D;
  const raHours = wrap360(ra) / 15;
  return altAz(raHours, dec, lat, lon, date);
}

export function moonPosition(date, lat = EAST_PASSAGE.lat, lon = EAST_PASSAGE.lon) {
  const n = julian(date) - 2451545.0;
  const L = wrap360(218.316 + 13.176396 * n);
  const M = wrap360(134.963 + 13.064993 * n);
  const F = wrap360(93.272 + 13.22935 * n);
  const lambda = wrap360(L + 6.289 * sind(M));
  const beta = 5.128 * sind(F);
  const eps = 23.439 - 0.00000036 * n;
  const ra = Math.atan2(cosd(eps) * sind(lambda) - sind(eps) * tandApprox(beta), cosd(lambda)) * R2D;
  const dec = Math.asin(clamp(sind(eps) * cosd(beta) * sind(lambda) + cosd(eps) * sind(beta), -1, 1)) * R2D;
  const raHours = wrap360(ra) / 15;
  return altAz(raHours, dec, lat, lon, date);
}

function tandApprox(deg) {
  return Math.tan(deg * D2R);
}

/**
 * Map alt/az onto the 480×270 south-facing harbor.
 * East (90°) is left, west (270°) is right, south is center.
 */
export function projectSky(alt, az, horizonY, W, pad = 24) {
  const eastWest = Math.sin((az - 180) * D2R);
  const x = W / 2 + eastWest * (W / 2 - pad);
  const y = horizonY - Math.sin(Math.max(0, alt) * D2R) * (horizonY - 14);
  return { x, y };
}

function phaseOf(alt, az) {
  if (alt >= 6) return "day";
  if (alt <= -9) return "night";
  return az < 180 ? "dawn" : "dusk";
}

export function skyAt(date = new Date(), lat = EAST_PASSAGE.lat, lon = EAST_PASSAGE.lon) {
  const sun = sunPosition(date, lat, lon);
  const moon = moonPosition(date, lat, lon);
  const phase = phaseOf(sun.alt, sun.az);
  const day = clamp(sun.alt / 10, 0, 1);
  const night = clamp((-sun.alt - 1) / 11, 0, 1);
  const twilight = clamp(1 - Math.abs(sun.alt + 1) / 10, 0, 1) * (1 - day * 0.35);
  return {
    date,
    phase,
    day,
    night,
    twilight,
    tagline: TAGLINE[phase],
    sun,
    moon,
  };
}

export function mixPalette(a, b, t) {
  const n = Math.min(a.length, b.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push([
      Math.round(lerp(a[i][0], b[i][0], t)),
      Math.round(lerp(a[i][1], b[i][1], t)),
      Math.round(lerp(a[i][2], b[i][2], t)),
    ]);
  }
  return out;
}

export { TAGLINE };
