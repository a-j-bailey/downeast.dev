export type Wash = "clear" | "cloud" | "rain" | "snow" | "fog" | "night";

export type WeatherWindow =
  | { kind: "pending"; wash: Wash }
  | { kind: "fogbound" }
  | {
      kind: "open";
      wash: Wash;
      lines: [string, ...string[]];
      place: string;
    };

export function guessPendingWash(): Wash {
  const hourText = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());
  const hour = Number.parseInt(hourText, 10);
  if (!Number.isFinite(hour)) {
    return "fog";
  }
  if (hour >= 20 || hour < 6) {
    return "night";
  }
  return "fog";
}

export type PrintInk = "ink" | "paper";

const DARK_WASH = {
  rain: true,
  night: true,
  clear: false,
  cloud: false,
  snow: false,
  fog: false,
} satisfies Record<Wash, boolean>;

export function washOf(weather: WeatherWindow): Wash {
  switch (weather.kind) {
    case "pending":
    case "open":
      return weather.wash;
    case "fogbound":
      return "fog";
    default: {
      const _exhaustive: never = weather;
      return _exhaustive;
    }
  }
}

export function inkOf(wash: Wash): PrintInk {
  return DARK_WASH[wash] ? "paper" : "ink";
}

export function groundOf(wash: Wash): string {
  switch (wash) {
    case "clear":
      return "#e4d6c0";
    case "cloud":
      return "#c5cdd4";
    case "rain":
      return "#1e2733";
    case "snow":
      return "#e4e8ec";
    case "fog":
      return "#b8b8b4";
    case "night":
      return "#0c1220";
    default: {
      const _exhaustive: never = wash;
      return _exhaustive;
    }
  }
}

type Sky = {
  wash: Exclude<Wash, "night">;
  word: string;
};

function skyOf(code: number): Sky {
  if (code === 0) {
    return { wash: "clear", word: "Clear" };
  }
  if (code === 1) {
    return { wash: "clear", word: "Mainly clear" };
  }
  if (code === 2) {
    return { wash: "cloud", word: "Partly cloudy" };
  }
  if (code === 3) {
    return { wash: "cloud", word: "Overcast" };
  }
  if (code === 45 || code === 48) {
    return { wash: "fog", word: "Fog" };
  }
  if (code >= 51 && code <= 57) {
    return { wash: "rain", word: "Drizzle" };
  }
  if (code >= 61 && code <= 67) {
    return { wash: "rain", word: "Rain" };
  }
  if (code >= 71 && code <= 77) {
    return { wash: "snow", word: "Snow" };
  }
  if (code >= 80 && code <= 82) {
    return { wash: "rain", word: "Showers" };
  }
  if (code >= 85 && code <= 86) {
    return { wash: "snow", word: "Snow showers" };
  }
  if (code >= 95 && code <= 99) {
    return { wash: "rain", word: "Thunderstorms" };
  }
  return { wash: "cloud", word: "Overcast" };
}

const CARDINALS: readonly [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

function cardinalOf(degrees: number): (typeof CARDINALS)[number] {
  const wrapped = ((degrees % 360) + 360) % 360;
  const index = Math.round(wrapped / 22.5) % 16;
  const name = CARDINALS[index];
  if (name === undefined) {
    return "N";
  }
  return name;
}

function windLine({ knots, from }: { knots: number; from: number }): string {
  if (knots < 4) {
    return "Light air.";
  }
  if (knots < 11) {
    return "Light breeze.";
  }
  if (knots < 17) {
    return "Moderate breeze.";
  }
  return `${cardinalOf(from)} ${Math.round(knots)} knots.`;
}

export function windowFromObs({
  temperature,
  weatherCode,
  windKnots,
  windFrom,
  day,
  place,
}: {
  temperature: number;
  weatherCode: number;
  windKnots: number;
  windFrom: number;
  day: boolean;
  place: string;
}): Extract<WeatherWindow, { kind: "open" }> {
  const sky = skyOf(weatherCode);
  const wash: Wash =
    !day && (sky.wash === "clear" || sky.wash === "cloud") ? "night" : sky.wash;

  const skyLine = `${sky.word}.`;
  const airLine = windLine({ knots: windKnots, from: windFrom });
  const tempLine = `${Math.round(temperature)}°.`;

  return {
    kind: "open",
    wash,
    lines: [skyLine, airLine, tempLine],
    place,
  };
}
