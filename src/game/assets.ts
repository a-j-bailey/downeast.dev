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
] as const;

export const STREAM_IMAGES = [
  "far-shore",
  "cloud",
  "lighthouse",
  "seawall",
  "seawall-stairs",
  "pier",
  "boat",
  "boat-underway",
  "wake",
  "shack-a",
  "shack-b",
  "sign-github",
  "sign-x",
  "kayak",
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
