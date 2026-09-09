import { VIEW_HEIGHT, VIEW_MAX_WIDTH, VIEW_WIDTH } from "./view";

/** Portrait-ish: used for on-screen stick, not for letterboxing. */
export const TALL_ASPECT = 1.5;

export function parentIsTall(width: number, height: number): boolean {
  return height > 0 && width / height < TALL_ASPECT;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export type HarborView = {
  viewW: number;
  viewH: number;
  tall: boolean;
  /** CSS scale (may be fractional). Framebuffer stays viewW×viewH. */
  zoom: number;
};

/**
 * Logical framebuffer. Height always 270. Width follows the parent aspect
 * so the canvas can fill the window without letterbox or side-crop.
 * Tall phones clamp to ≥200 so the berth stays in frame.
 */
export function computeHarborView(parentW: number, parentH: number): HarborView {
  const w = Math.max(1, parentW);
  const h = Math.max(1, parentH);
  const tall = parentIsTall(w, h);
  const viewW = clamp(Math.round(VIEW_HEIGHT * (w / h)), 200, VIEW_MAX_WIDTH);
  return { viewW, viewH: VIEW_HEIGHT, tall, zoom: h / VIEW_HEIGHT };
}

/**
 * Manual CSS layout for Phaser.Scale.NONE.
 * Canvas always fills the parent — desktop full-bleed, same as tall phones.
 * Framebuffer stays 1:1; CSS may be fractional. `image-rendering: pixelated`.
 */
export function layoutHarborCanvas(
  parent: HTMLElement,
  canvas: HTMLCanvasElement,
  _viewW: number = VIEW_WIDTH,
  _viewH: number = VIEW_HEIGHT,
): void {
  const parentW = Math.max(1, parent.clientWidth || window.innerWidth || 1);
  const parentH = Math.max(1, parent.clientHeight || window.innerHeight || 1);

  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.right = "0";
  canvas.style.bottom = "0";
  canvas.style.transform = "none";
  canvas.style.width = `${parentW}px`;
  canvas.style.height = `${parentH}px`;
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.margin = "0";
  canvas.style.imageRendering = "pixelated";
  parent.style.overflow = "hidden";
}
