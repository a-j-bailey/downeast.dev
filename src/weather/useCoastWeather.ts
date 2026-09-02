import { useEffect, useState } from "react";
import { readForecast } from "./readForecast";
import type { WeatherWindow } from "./window";

export function useCoastWeather(): WeatherWindow {
  const [weather, setWeather] = useState<WeatherWindow>({ kind: "pending" });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      controller.abort();
    }, 8000);

    void readForecast({ signal: controller.signal })
      .then((next) => {
        if (!cancelled) {
          setWeather(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeather({ kind: "fogbound" });
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
