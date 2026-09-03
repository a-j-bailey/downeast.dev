export const ART_DIR = "/harbor/processed";

export const BOOT_IMAGES = [
  "water",
  "player-idle",
  "player-walk-0",
  "player-walk-1",
  "player-walk-2",
  "player-walk-3",
  "player-use",
  "coffee-shop",
  "lighthouse",
  "far-shore",
  "seawall",
  "pier",
  "boat",
  "shack-a",
  "shack-b",
  "sign-github",
  "sign-x",
  "kayak",
  "cloud",
] as const;

export const STREAM_IMAGES = [
  "seawall-stairs",
  "boat-underway",
  "wake",
  "paddle",
  "trap",
  "trap-stack",
  "trap-buoy",
  "shark",
  "shark-fin",
] as const;

export function artUrl(key: string): string {
  return `${ART_DIR}/${key}.png`;
}
