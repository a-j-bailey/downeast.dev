import {
  BOAT_STERN,
  WAKE_PNG_APEX,
  WAKE_PNG_SIZE,
  WAKE_SVG_APEX,
  WAKE_VIEWBOX,
} from "./geometry";

export type Point = {
  x: number;
  y: number;
};

export type WakeBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type WakeLayout = {
  stern: Point;
  png: WakeBox;
  svg: WakeBox;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function wakeProgress(input: {
  pointer: Point | null;
  scrollY: number;
  stern: Point;
  range: number;
}): number {
  const fromScroll = clamp(input.scrollY / 520, 0, 1);
  const rest = 0.34;
  if (input.pointer === null) {
    return clamp(Math.max(fromScroll, rest), 0, 1);
  }

  const behind = Math.max(0, input.stern.x - input.pointer.x);
  const rise = (input.pointer.y - input.stern.y) * 0.4;
  const fromPointer = clamp(Math.hypot(behind, rise) / input.range, 0, 1);
  return clamp(Math.max(fromScroll, fromPointer, rest), 0, 1);
}

export function layoutWake(boat: DOMRect, stage: DOMRect): WakeLayout {
  const stern = {
    x: boat.left - stage.left + boat.width * BOAT_STERN.x,
    y: boat.top - stage.top + boat.height * BOAT_STERN.y,
  };
  const pngWidth = Math.max(boat.width * 1.38, 22 * 16);
  const pngHeight =
    pngWidth * (WAKE_PNG_SIZE.height / WAKE_PNG_SIZE.width);
  const svgWidth = Math.max(boat.width * 1.6, 24 * 16);
  const svgHeight =
    svgWidth * (WAKE_VIEWBOX.height / WAKE_VIEWBOX.width);

  return {
    stern,
    png: {
      left: stern.x - pngWidth * WAKE_PNG_APEX.x,
      top: stern.y - pngHeight * WAKE_PNG_APEX.y,
      width: pngWidth,
      height: pngHeight,
    },
    svg: {
      left: stern.x - svgWidth * (WAKE_SVG_APEX.x / WAKE_VIEWBOX.width),
      top: stern.y - svgHeight * (WAKE_SVG_APEX.y / WAKE_VIEWBOX.height),
      width: svgWidth,
      height: svgHeight,
    },
  };
}
