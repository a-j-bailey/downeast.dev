import type { Period, Weather } from "./types";

export const BRISTOL_LAT = 41.677;
export const BRISTOL_LON = -71.266;
const CACHE_MS = 15 * 60 * 1000;
const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=41.677&longitude=-71.266&current=is_day,precipitation,weather_code,cloud_cover,visibility&timezone=America%2FNew_York";

const FOG_CODES = new Set([45, 48]);
const RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

type Cache = { at: number; weather: Weather };

let cache: Cache | null = null;
let inflight: Promise<Weather> | null = null;

type MeteoCurrent = {
  is_day: number;
  precipitation: number;
  weather_code: number;
  cloud_cover: number;
  visibility: number;
};

type MeteoResponse = {
  current: MeteoCurrent;
};

export function solarElevationDeg(at: Date, lat = BRISTOL_LAT, lon = BRISTOL_LON): number {
  const start = Date.UTC(at.getUTCFullYear(), 0, 0);
  const day = (at.getTime() - start) / 86400000;
  const decl = 23.44 * Math.sin(((360 / 365) * (day - 81) * Math.PI) / 180);
  const utcH = at.getUTCHours() + at.getUTCMinutes() / 60 + at.getUTCSeconds() / 3600;
  const hourAngle = 15 * (utcH + lon / 15 - 12);
  const latR = (lat * Math.PI) / 180;
  const decR = (decl * Math.PI) / 180;
  const haR = (hourAngle * Math.PI) / 180;
  const sinEl =
    Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR);
  return (Math.asin(Math.min(1, Math.max(-1, sinEl))) * 180) / Math.PI;
}

export function periodFromSun(solarDeg: number, isDay: boolean): Period {
  if (solarDeg < -6 || (!isDay && solarDeg < 0)) {
    return "night";
  }
  if (solarDeg < 8) {
    return "dusk";
  }
  return "day";
}

export function fallbackWeather(at = new Date()): Weather {
  const solarDeg = solarElevationDeg(at);
  const isDay = solarDeg > 0;
  return {
    period: periodFromSun(solarDeg, isDay),
    isDay,
    precipitation: 0,
    cloudCover: 18,
    visibilityM: 20000,
    weatherCode: 0,
    fog: false,
    rain: false,
    solarDeg,
    fetched: false,
  };
}

function fromMeteo(current: MeteoCurrent, at: Date): Weather {
  const solarDeg = solarElevationDeg(at);
  const isDay = current.is_day === 1;
  const rain = current.precipitation > 0 || RAIN_CODES.has(current.weather_code);
  const fog =
    FOG_CODES.has(current.weather_code) || current.visibility < 2000;
  return {
    period: periodFromSun(solarDeg, isDay),
    isDay,
    precipitation: current.precipitation,
    cloudCover: current.cloud_cover,
    visibilityM: current.visibility,
    weatherCode: current.weather_code,
    fog,
    rain,
    solarDeg,
    fetched: true,
  };
}

export function cachedWeather(): Weather {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.weather;
  }
  return fallbackWeather();
}

export function loadWeather(): Promise<Weather> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return Promise.resolve(cache.weather);
  }
  if (inflight) {
    return inflight;
  }
  inflight = fetch(FORECAST_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      return res.json() as Promise<MeteoResponse>;
    })
    .then((body) => {
      const weather = fromMeteo(body.current, new Date());
      cache = { at: Date.now(), weather };
      return weather;
    })
    .catch(() => fallbackWeather())
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
