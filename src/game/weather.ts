export const WEATHER_MOODS = [
  "clearDay",
  "overcast",
  "rain",
  "fog",
  "night",
] as const;

export type WeatherMood = (typeof WEATHER_MOODS)[number];

export type HarborAtmosphere = {
  mood: WeatherMood;
  windSpeedKmh: number;
  windDirDeg: number;
};

const CACHE_KEY = "harbor-weather-v2";
const CACHE_MS = 20 * 60 * 1000;

const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=41.677&longitude=-71.266&current=weather_code,is_day,wind_speed_10m,wind_direction_10m&timezone=America/New_York";

type CachedAtmosphere = {
  mood: WeatherMood;
  windSpeedKmh: number;
  windDirDeg: number;
  savedAt: number;
};

export function weatherFromQuery(search: string): WeatherMood | null {
  const raw = new URLSearchParams(search).get("weather");
  if (!raw) {
    return null;
  }
  for (const mood of WEATHER_MOODS) {
    if (mood === raw) {
      return mood;
    }
  }
  return null;
}

export function moodFromForecast(isDay: number, code: number): WeatherMood {
  if (isDay === 0) {
    return "night";
  }
  if (code === 45 || code === 48) {
    return "fog";
  }
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return "rain";
  }
  if (code >= 2 && code <= 3) {
    return "overcast";
  }
  return "clearDay";
}

export function moodFromClock(now = new Date()): WeatherMood {
  const hourText = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  const hour = Number.parseInt(hourText, 10);
  return hour >= 6 && hour < 20 ? "clearDay" : "night";
}

export function skyColor(mood: WeatherMood): number {
  switch (mood) {
    case "clearDay":
      return 0x5b93c5;
    case "overcast":
      return 0x6d7784;
    case "rain":
      return 0x4f5b68;
    case "fog":
      return 0x8a9096;
    case "night":
      return 0x0e1624;
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}

/** CSS hex for page/letterbox edges so cropped sides match mood. */
export function skyCss(mood: WeatherMood): string {
  return `#${skyColor(mood).toString(16).padStart(6, "0")}`;
}

export function ambientColor(mood: WeatherMood): number {
  switch (mood) {
    case "clearDay":
      return 0x8899aa;
    case "overcast":
      return 0x667788;
    case "rain":
      return 0x556677;
    case "fog":
      return 0x889099;
    case "night":
      return 0x2a3348;
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}

/**
 * Current instant, with playtest overrides:
 * `?hour=6.5` or `?hour=18&minute=45` — that clock in America/New_York
 * on today's NY calendar date.
 */
export function harborNow(search?: string, fallback = new Date()): Date {
  const q = new URLSearchParams(
    search ?? (typeof window !== "undefined" ? window.location.search : ""),
  );
  const hourRaw = q.get("hour");
  if (hourRaw === null || hourRaw === "") {
    return fallback;
  }
  const hourNum = Number.parseFloat(hourRaw);
  if (!Number.isFinite(hourNum) || hourNum < 0 || hourNum >= 24) {
    return fallback;
  }
  let minute = Math.round((hourNum % 1) * 60);
  const hour = Math.floor(hourNum) % 24;
  const minuteRaw = q.get("minute");
  if (minuteRaw !== null && minuteRaw !== "") {
    const parsed = Number.parseInt(minuteRaw, 10);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed < 60) {
      minute = parsed;
    }
  }
  return dateWithNyClock(fallback, hour, minute);
}

function dateWithNyClock(base: Date, hour: number, minute: number): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(base);
  const num = (type: string): number =>
    Number.parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const nyHour = num("hour");
  const nyMin = num("minute");
  const nySec = num("second");
  const deltaMs =
    ((hour - nyHour) * 60 + (minute - nyMin)) * 60 * 1000 - nySec * 1000;
  return new Date(base.getTime() + deltaMs);
}

export function nyClock(now = harborNow()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

function isAtmosphere(value: unknown): value is CachedAtmosphere {
  if (!value || typeof value !== "object") {
    return false;
  }
  const rec = value as Partial<CachedAtmosphere>;
  return (
    typeof rec.savedAt === "number" &&
    typeof rec.windSpeedKmh === "number" &&
    typeof rec.windDirDeg === "number" &&
    typeof rec.mood === "string" &&
    WEATHER_MOODS.includes(rec.mood as WeatherMood)
  );
}

function readCache(now: number): HarborAtmosphere | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isAtmosphere(parsed) || now - parsed.savedAt > CACHE_MS) {
      return null;
    }
    return {
      mood: parsed.mood,
      windSpeedKmh: parsed.windSpeedKmh,
      windDirDeg: parsed.windDirDeg,
    };
  } catch {
    return null;
  }
}

function writeCache(atmo: HarborAtmosphere, now: number): void {
  try {
    const payload: CachedAtmosphere = { ...atmo, savedAt: now };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function mergeQueryWind(
  search: string,
  fetched: HarborAtmosphere,
): HarborAtmosphere {
  const q = new URLSearchParams(search);
  let speed = fetched.windSpeedKmh;
  let dir = fetched.windDirDeg;
  const speedRaw = q.get("wind");
  const dirRaw = q.get("winddir");
  if (speedRaw !== null) {
    const parsed = Number.parseFloat(speedRaw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      speed = parsed;
    }
  }
  if (dirRaw !== null) {
    const parsed = Number.parseFloat(dirRaw);
    if (Number.isFinite(parsed)) {
      dir = ((parsed % 360) + 360) % 360;
    }
  }
  const forced = weatherFromQuery(search);
  return {
    mood: forced ?? fetched.mood,
    windSpeedKmh: speed,
    windDirDeg: dir,
  };
}

export async function loadAtmosphere(search: string): Promise<HarborAtmosphere> {
  const forcedMood = weatherFromQuery(search);
  const now = Date.now();
  const cached = readCache(now);
  const fallback: HarborAtmosphere = {
    mood: forcedMood ?? moodFromClock(harborNow(search)),
    windSpeedKmh: 10,
    windDirDeg: 240,
  };

  if (cached) {
    return mergeQueryWind(search, {
      mood: forcedMood ?? cached.mood,
      windSpeedKmh: cached.windSpeedKmh,
      windDirDeg: cached.windDirDeg,
    });
  }

  try {
    const response = await fetch(FORECAST_URL);
    if (!response.ok) {
      return mergeQueryWind(search, fallback);
    }
    const body = (await response.json()) as {
      current?: {
        weather_code?: number;
        is_day?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
      };
    };
    const code = Number(body.current?.weather_code);
    const isDay = Number(body.current?.is_day);
    const windSpeed = Number(body.current?.wind_speed_10m);
    const windDir = Number(body.current?.wind_direction_10m);
    const mood =
      Number.isFinite(code) && Number.isFinite(isDay)
        ? moodFromForecast(isDay, code)
        : fallback.mood;
    const fetched: HarborAtmosphere = {
      mood,
      windSpeedKmh: Number.isFinite(windSpeed) ? windSpeed : fallback.windSpeedKmh,
      windDirDeg: Number.isFinite(windDir) ? windDir : fallback.windDirDeg,
    };
    writeCache(fetched, now);
    return mergeQueryWind(search, {
      mood: forcedMood ?? fetched.mood,
      windSpeedKmh: fetched.windSpeedKmh,
      windDirDeg: fetched.windDirDeg,
    });
  } catch {
    return mergeQueryWind(search, fallback);
  }
}

export async function loadWeatherMood(search: string): Promise<WeatherMood> {
  return (await loadAtmosphere(search)).mood;
}
