import { HORIZON_Y, WATER_BOTTOM_Y, WATER_SURFACE_Y } from "./layout";

/**
 * NOAA CO-OPS station 8451929 — Bristol, Bristol Harbor, Narragansett Bay, RI.
 * 41.6683°N, 71.2800°W (~1 km from the Open-Meteo pin at 41.677, −71.266).
 * Subordinate of Newport 8452660. High/low predictions only (no 6-minute series).
 * https://tidesandcurrents.noaa.gov/stationhome.html?id=8451929
 */
export const TIDE_STATION_ID = "8451929";
export const TIDE_STATION_NAME = "Bristol, Bristol Harbor, Narragansett Bay, RI";

export const TIDE_OVERRIDES = ["high", "low", "mid"] as const;
export type TideOverride = (typeof TIDE_OVERRIDES)[number];

/** Half-range in pixels. High/low differ by 24px so the waterline is obvious. */
export const TIDE_RANGE_PX = 12;

/**
 * MLLW feet → 0..1. Bristol Harbor mean range is ~3.6–4.1 ft; 0–4.8 lets
 * spring highs reach the top of the band without pinning every day to the rails.
 */
const TIDE_LOW_FT = 0;
const TIDE_HIGH_FT = 4.8;

const CACHE_KEY = "harbor-tide-v1";
const CACHE_MS = 20 * 60 * 1000;

const MID_LEVEL = 0.5;

type TidePoint = {
  t: number;
  v: number;
};

type CachedTide = {
  points: TidePoint[];
  savedAt: number;
};

export function tideFromQuery(search: string): TideOverride | null {
  const raw = new URLSearchParams(search).get("tide");
  if (!raw) {
    return null;
  }
  for (const value of TIDE_OVERRIDES) {
    if (value === raw) {
      return value;
    }
  }
  return null;
}

export function levelFromOverride(value: TideOverride): number {
  switch (value) {
    case "high":
      return 1;
    case "low":
      return 0;
    case "mid":
      return MID_LEVEL;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function levelFromHeightFt(heightFt: number): number {
  return clamp01((heightFt - TIDE_LOW_FT) / (TIDE_HIGH_FT - TIDE_LOW_FT));
}

/** High tide raises the far surface (smaller Y) and covers more seawall base. */
export function tideSurfaceY(level: number): number {
  const t = clamp01(level);
  return Math.round(WATER_SURFACE_Y + (0.5 - t) * 2 * TIDE_RANGE_PX);
}

/** High tide pushes the water/land meet down the seawall a few pixels. */
export function tideShoreY(level: number): number {
  const t = clamp01(level);
  return Math.round(WATER_BOTTOM_Y + (t - 0.5) * 2 * TIDE_RANGE_PX);
}

/** Deep water always covers the horizon so a low tide cannot open a sky gap. */
export function tideWaterTop(surfaceY: number): number {
  return Math.min(surfaceY, HORIZON_Y);
}

export function heightAt(nowMs: number, points: TidePoint[]): number | null {
  if (points.length === 0) {
    return null;
  }
  if (nowMs <= points[0]!.t) {
    return points[0]!.v;
  }
  const last = points[points.length - 1]!;
  if (nowMs >= last.t) {
    return last.v;
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (nowMs > b.t) {
      continue;
    }
    const span = b.t - a.t;
    if (span <= 0) {
      return b.v;
    }
    const u = (nowMs - a.t) / span;
    const s = (1 - Math.cos(Math.PI * u)) / 2;
    return a.v + (b.v - a.v) * s;
  }
  return last.v;
}

function ymdUtc(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function predictionsUrl(nowMs: number): string {
  const begin = ymdUtc(nowMs - 24 * 60 * 60 * 1000);
  const end = ymdUtc(nowMs + 2 * 24 * 60 * 60 * 1000);
  const q = new URLSearchParams({
    begin_date: begin,
    end_date: end,
    station: TIDE_STATION_ID,
    product: "predictions",
    datum: "MLLW",
    time_zone: "gmt",
    interval: "hilo",
    units: "english",
    format: "json",
    application: "downeast.dev",
  });
  return `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${q.toString()}`;
}

function parseNoaaGmt(stamp: string): number {
  const iso = `${stamp.trim().replace(" ", "T")}:00Z`;
  return Date.parse(iso);
}

function parsePoints(body: unknown): TidePoint[] | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const rec = body as { predictions?: unknown; error?: unknown };
  if (rec.error) {
    return null;
  }
  if (!Array.isArray(rec.predictions)) {
    return null;
  }
  const points: TidePoint[] = [];
  for (const row of rec.predictions) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const item = row as { t?: unknown; v?: unknown };
    if (typeof item.t !== "string") {
      continue;
    }
    const t = parseNoaaGmt(item.t);
    const v = Number(item.v);
    if (!Number.isFinite(t) || !Number.isFinite(v)) {
      continue;
    }
    points.push({ t, v });
  }
  points.sort((a, b) => a.t - b.t);
  return points.length >= 2 ? points : null;
}

function readCache(nowMs: number): TidePoint[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedTide;
    if (typeof parsed.savedAt !== "number" || nowMs - parsed.savedAt > CACHE_MS) {
      return null;
    }
    if (!Array.isArray(parsed.points) || parsed.points.length < 2) {
      return null;
    }
    const points: TidePoint[] = [];
    for (const row of parsed.points) {
      if (!row || typeof row.t !== "number" || typeof row.v !== "number") {
        return null;
      }
      if (!Number.isFinite(row.t) || !Number.isFinite(row.v)) {
        return null;
      }
      points.push({ t: row.t, v: row.v });
    }
    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
}

function writeCache(points: TidePoint[], nowMs: number): void {
  try {
    const payload: CachedTide = { points, savedAt: nowMs };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function levelFromPoints(points: TidePoint[], nowMs: number): number {
  const height = heightAt(nowMs, points);
  if (height === null) {
    return MID_LEVEL;
  }
  return levelFromHeightFt(height);
}

export async function loadTideLevel(search: string, nowMs = Date.now()): Promise<number> {
  const forced = tideFromQuery(search);
  if (forced) {
    return levelFromOverride(forced);
  }

  const cached = readCache(nowMs);
  if (cached) {
    return levelFromPoints(cached, nowMs);
  }

  try {
    const response = await fetch(predictionsUrl(nowMs));
    if (!response.ok) {
      return MID_LEVEL;
    }
    const points = parsePoints(await response.json());
    if (!points) {
      return MID_LEVEL;
    }
    writeCache(points, nowMs);
    return levelFromPoints(points, nowMs);
  } catch {
    return MID_LEVEL;
  }
}
