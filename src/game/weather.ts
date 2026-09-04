export const WEATHER_MOODS = [
  "clearDay",
  "overcast",
  "rain",
  "fog",
  "night",
] as const;

export type WeatherMood = (typeof WEATHER_MOODS)[number];

const CACHE_KEY = "harbor-weather-v1";
const CACHE_MS = 20 * 60 * 1000;

const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=41.677&longitude=-71.266&current=weather_code,is_day&timezone=America/New_York";

type CachedWeather = {
  mood: WeatherMood;
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

export function skyCss(mood: WeatherMood): string {
  return `#${skyColor(mood).toString(16).padStart(6, "0")}`;
}

export function nyClock(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

function readCache(now: number): WeatherMood | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedWeather;
    if (
      typeof parsed.savedAt !== "number" ||
      now - parsed.savedAt > CACHE_MS ||
      !WEATHER_MOODS.includes(parsed.mood)
    ) {
      return null;
    }
    return parsed.mood;
  } catch {
    return null;
  }
}

function writeCache(mood: WeatherMood, now: number): void {
  try {
    const payload: CachedWeather = { mood, savedAt: now };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export async function loadWeatherMood(search: string): Promise<WeatherMood> {
  const forced = weatherFromQuery(search);
  if (forced) {
    return forced;
  }

  const now = Date.now();
  const cached = readCache(now);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(FORECAST_URL);
    if (!response.ok) {
      return moodFromClock();
    }
    const body = (await response.json()) as {
      current?: { weather_code?: number; is_day?: number };
    };
    const code = Number(body.current?.weather_code);
    const isDay = Number(body.current?.is_day);
    if (!Number.isFinite(code) || !Number.isFinite(isDay)) {
      return moodFromClock();
    }
    const mood = moodFromForecast(isDay, code);
    writeCache(mood, now);
    return mood;
  } catch {
    return moodFromClock();
  }
}
