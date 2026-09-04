export const ART_DIR = "/harbor/processed";

export const BOOT_IMAGES = [
  "water",
  "water-deep",
  "waves-foam",
  "waves-0",
  "wharf-planks",
  "road-stone",
  "player-idle",
  "player-idle-stand",
  "player-walk-0",
  "player-walk-1",
  "player-walk-2",
  "player-walk-3",
  "player-walk-pass",
  "player-use",
  "coffee-shop",
  "lighthouse",
  "far-shore",
  "seawall",
  "pier",
  "dock",
  "fender",
  "boat",
  "shack-a",
  "shack-b",
  "sign-github",
  "sign-x",
  "kayak",
  "cloud",
  "sun",
  "moon",
  "star",
  "glow-window",
  "glow-street",
  "lantern",
  "lantern-glow",
] as const;

export const STREAM_IMAGES = [
  "seawall-stairs",
  "boat-underway",
  "wake",
  "paddle",
  "trap",
  "trap-stack",
  "trap-buoy",
  "shark-fin",
  "waves-1",
  "waves-2",
] as const;

export function artUrl(key: string): string {
  return `${ART_DIR}/${key}.png`;
}
