import { useEffect, useState } from "react";
import { readForecast } from "./readForecast";
import {
  guessPendingWash,
  type Wash,
  type WeatherWindow,
} from "./window";

const CACHE_KEY = "downeast-coast-window";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWash(value: unknown): value is Wash {
  return (
    value === "clear" ||
    value === "cloud" ||
    value === "rain" ||
    value === "snow" ||
    value === "fog" ||
    value === "night"
  );
}

function readCachedOpen(): Extract<WeatherWindow, { kind: "open" }> | undefined {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.kind !== "open" || !isWash(parsed.wash)) {
      return undefined;
    }
    if (typeof parsed.place !== "string" || !Array.isArray(parsed.lines)) {
      return undefined;
    }
    if (parsed.lines.length === 0 || !parsed.lines.every((line) => typeof line === "string")) {
      return undefined;
    }
    const [first, ...rest] = parsed.lines;
    if (first === undefined) {
      return undefined;
    }
    return {
      kind: "open",
      wash: parsed.wash,
      lines: [first, ...rest],
      place: parsed.place,
    };
  } catch {
    return undefined;
  }
}

function writeCachedOpen(weather: WeatherWindow): void {
  if (weather.kind !== "open") {
    return;
  }
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(weather));
  } catch {
    return;
  }
}

export function useCoastWeather(): WeatherWindow {
  const [weather, setWeather] = useState<WeatherWindow>(
    () => readCachedOpen() ?? { kind: "pending", wash: guessPendingWash() },
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      controller.abort();
    }, 8000);

    void readForecast({ signal: controller.signal })
      .then((next) => {
        if (cancelled) {
          return;
        }
        if (next.kind === "fogbound") {
          setWeather((current) => (current.kind === "open" ? current : next));
          return;
        }
        writeCachedOpen(next);
        setWeather(next);
      })
      .catch(() => {
        if (!cancelled) {
          setWeather((current) =>
            current.kind === "open" ? current : { kind: "fogbound" },
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return weather;
}
