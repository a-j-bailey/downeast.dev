import { COAST, FORECAST_URL } from "./coast";
import { windowFromObs, type WeatherWindow } from "./window";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readCurrent(payload: unknown): {
  temperature: number;
  weatherCode: number;
  windKnots: number;
  windFrom: number;
  day: boolean;
} | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }
  if (!isRecord(payload.current)) {
    return undefined;
  }
  const temperature = readNumber(payload.current.temperature_2m);
  const weatherCode = readNumber(payload.current.weather_code);
  const windKnots = readNumber(payload.current.wind_speed_10m);
  const windFrom = readNumber(payload.current.wind_direction_10m);
  const isDay = readNumber(payload.current.is_day);
  if (
    temperature === undefined ||
    weatherCode === undefined ||
    windKnots === undefined ||
    windFrom === undefined ||
    isDay === undefined
  ) {
    return undefined;
  }
  return {
    temperature,
    weatherCode,
    windKnots,
    windFrom,
    day: isDay !== 0,
  };
}

export async function readForecast({
  signal,
}: {
  signal: AbortSignal;
}): Promise<WeatherWindow> {
  const response = await fetch(FORECAST_URL, { signal });
  if (!response.ok) {
    return { kind: "fogbound" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { kind: "fogbound" };
  }

  const obs = readCurrent(payload);
  if (!obs) {
    return { kind: "fogbound" };
  }

  return windowFromObs({ ...obs, place: COAST.name });
}
