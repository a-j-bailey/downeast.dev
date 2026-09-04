/**
 * Prudence Island ferry (Bristol ↔ Prudence) public timetable.
 * Source: https://prudencebayislandstransport.com/schedules/
 * Summer: https://prudencebayislandstransport.com/schedules/summer/
 * Spring: https://prudencebayislandstransport.com/schedules/spring/
 * Fall: https://prudencebayislandstransport.com/schedules/fall/
 * Winter: https://prudencebayislandstransport.com/schedules/winter/
 * Travel time is 30 minutes pier to pier (America/New_York).
 */

export const CROSSING_MINUTES = 30;
export const FERRY_TZ = "America/New_York";

export type Terminal = "bristol" | "prudence";

export type Trip = {
  hour: number;
  minute: number;
  from: Terminal;
};

export type NyParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
  second: number;
};

export type ActiveCrossing = {
  from: Terminal;
  progress: number;
};

type SeasonId = "spring" | "summer" | "fall" | "winter";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function br(hour: number, minute: number): Trip {
  return { hour, minute, from: "bristol" };
}

function pi(hour: number, minute: number): Trip {
  return { hour, minute, from: "prudence" };
}

const EARLY = [br(5, 45), pi(6, 20), br(7, 30), pi(8, 30)];
const NINE_FORTY_FIVE = [br(9, 45), pi(10, 30)];
const ELEVEN_THIRTY = [br(11, 30), pi(12, 15)];
const ONE_THIRTY = [br(13, 30), pi(14, 30)];
const THREE_THIRTY = [br(15, 30), pi(16, 15)];
const FIVE_THIRTY = [br(17, 30), pi(18, 0)];
const FIVE_OCLOCK = [br(17, 0), pi(18, 0)];
const FRIDAY_EVE = [br(18, 0), pi(18, 30), br(19, 30), pi(20, 0)];
const WEEKEND_MORNING = [br(7, 30), pi(8, 30), ...NINE_FORTY_FIVE];

/** Mon/Wed summer + spring/fall Wednesday. */
const WEEKDAY_WITH_MORNING = [...EARLY, ...NINE_FORTY_FIVE, ...THREE_THIRTY, ...FIVE_THIRTY];
/** Tue/Thu without 9:45, with optional 1:30. */
const WEEKDAY_NO_MORNING = [...EARLY, ...THREE_THIRTY, ...FIVE_THIRTY];
const WEEKDAY_WITH_AFTERNOON = [...EARLY, ...ONE_THIRTY, ...THREE_THIRTY, ...FIVE_THIRTY];

const FRIDAY_FULL = [...EARLY, ...NINE_FORTY_FIVE, ...THREE_THIRTY, ...FRIDAY_EVE];
const SATURDAY_SUMMER = [...WEEKEND_MORNING, ...ELEVEN_THIRTY, ...THREE_THIRTY, ...FIVE_OCLOCK];
const SATURDAY_SHORT = [...WEEKEND_MORNING, ...THREE_THIRTY, ...FIVE_OCLOCK];
const SUNDAY_FULL = [...WEEKEND_MORNING, ...ELEVEN_THIRTY, ...THREE_THIRTY, ...FIVE_OCLOCK];
const SUNDAY_NO_MIDDAY = [...WEEKEND_MORNING, ...THREE_THIRTY, ...FIVE_OCLOCK];

const JULY_FOURTH = [
  br(6, 45),
  pi(7, 15),
  br(9, 45),
  pi(10, 30),
  br(13, 30),
  pi(14, 30),
  ...THREE_THIRTY,
  ...FIVE_THIRTY,
];

const HOLIDAY_TWO_RUNS = [...NINE_FORTY_FIVE, ...THREE_THIRTY];

const SEASON_DAYS: Record<SeasonId, Trip[][]> = {
  spring: [
    SUNDAY_FULL,
    WEEKDAY_NO_MORNING,
    WEEKDAY_WITH_AFTERNOON,
    WEEKDAY_WITH_MORNING,
    WEEKDAY_WITH_AFTERNOON,
    FRIDAY_FULL,
    SATURDAY_SHORT,
  ],
  summer: [
    SUNDAY_FULL,
    WEEKDAY_WITH_MORNING,
    WEEKDAY_WITH_AFTERNOON,
    WEEKDAY_WITH_MORNING,
    WEEKDAY_WITH_AFTERNOON,
    FRIDAY_FULL,
    SATURDAY_SUMMER,
  ],
  fall: [
    SUNDAY_FULL,
    WEEKDAY_NO_MORNING,
    WEEKDAY_WITH_AFTERNOON,
    WEEKDAY_WITH_MORNING,
    WEEKDAY_WITH_AFTERNOON,
    FRIDAY_FULL,
    SATURDAY_SHORT,
  ],
  winter: [
    SUNDAY_NO_MIDDAY,
    [...EARLY, ...THREE_THIRTY, ...FIVE_THIRTY],
    [...EARLY, ...THREE_THIRTY, ...FIVE_THIRTY],
    WEEKDAY_WITH_MORNING,
    WEEKDAY_WITH_AFTERNOON,
    FRIDAY_FULL,
    SATURDAY_SHORT,
  ],
};

export function nyParts(now: Date): NyParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: FERRY_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag = fmt.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    bag.find((part) => part.type === type)?.value ?? "";
  const weekdayName = get("weekday");
  const weekday = WEEKDAY_INDEX[weekdayName] ?? 0;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function ferryForced(search: string): boolean {
  const raw = new URLSearchParams(search).get("ferry");
  return raw === "1" || raw === "true";
}

export function activeCrossing(now = new Date()): ActiveCrossing | null {
  const parts = nyParts(now);
  const trips = tripsFor(parts);
  if (trips.length === 0) {
    return null;
  }
  const minutes = parts.hour * 60 + parts.minute + parts.second / 60;
  for (const trip of trips) {
    const start = trip.hour * 60 + trip.minute;
    const end = start + CROSSING_MINUTES;
    if (minutes >= start && minutes < end) {
      return {
        from: trip.from,
        progress: (minutes - start) / CROSSING_MINUTES,
      };
    }
  }
  return null;
}

export function tripsFor(parts: NyParts): Trip[] {
  const holiday = holidayTrips(parts);
  if (holiday === "none") {
    return [];
  }
  if (holiday) {
    return holiday;
  }
  const season = seasonId(parts.month, parts.day);
  const sunday = holidaySunday(parts);
  const weekday = sunday ? 0 : parts.weekday;
  return SEASON_DAYS[season][weekday] ?? [];
}

function seasonId(month: number, day: number): SeasonId {
  const n = month * 100 + day;
  if (n >= 401 && n <= 531) {
    return "spring";
  }
  if (n >= 601 && n <= 930) {
    return "summer";
  }
  if (n >= 1001 && n <= 1130) {
    return "fall";
  }
  return "winter";
}

function holidayTrips(parts: NyParts): Trip[] | "none" | null {
  const { year, month, day } = parts;
  if (month === 12 && day === 25) {
    return "none";
  }
  if (month === 1 && day === 1) {
    return HOLIDAY_TWO_RUNS;
  }
  if (month === 7 && day === 4) {
    return JULY_FOURTH;
  }
  if (month === 11 && day === thanksgivingDay(year)) {
    return HOLIDAY_TWO_RUNS;
  }
  const easter = easterSunday(year);
  if (month === easter.month && day === easter.day) {
    return SUNDAY_NO_MIDDAY;
  }
  return null;
}

function holidaySunday(parts: NyParts): boolean {
  const { year, month, day } = parts;
  return (
    (month === 5 && day === memorialDay(year)) ||
    (month === 9 && day === laborDay(year)) ||
    (month === 10 && day === columbusDay(year))
  );
}

function weekdayOn(year: number, month: number, day: number): number {
  return nyParts(new Date(Date.UTC(year, month - 1, day, 17, 0, 0))).weekday;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  const first = weekdayOn(year, month, 1);
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = weekdayOn(year, month, dim);
  return dim - ((last - weekday + 7) % 7);
}

function laborDay(year: number): number {
  return nthWeekdayOfMonth(year, 9, 1, 1);
}

function memorialDay(year: number): number {
  return lastWeekdayOfMonth(year, 5, 1);
}

function columbusDay(year: number): number {
  return nthWeekdayOfMonth(year, 10, 1, 2);
}

function thanksgivingDay(year: number): number {
  return nthWeekdayOfMonth(year, 11, 4, 4);
}

/** Anonymous Gregorian computus. */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

export function bowFacesRight(from: Terminal): boolean {
  switch (from) {
    case "bristol":
      return true;
    case "prudence":
      return false;
    default: {
      const _exhaustive: never = from;
      return _exhaustive;
    }
  }
}
