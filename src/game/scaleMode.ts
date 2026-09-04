import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";

/** Portrait-ish: shrink game width to phone aspect. Landscape: FIT 480×270. */
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
 * Logical framebuffer. Height always 270; tall phones shrink width to the
 * parent aspect (clamped ≥200) so the docked boat and street stay in frame.
 * Do not derive width from an integer CSS zoom — that crops and looks larger.
 */
export function computeHarborView(parentW: number, parentH: number): HarborView {
  const w = Math.max(1, parentW);
  const h = Math.max(1, parentH);
  const tall = parentIsTall(w, h);
  if (tall) {
    const viewW = clamp(Math.round(VIEW_HEIGHT * (w / h)), 200, VIEW_WIDTH);
    return { viewW, viewH: VIEW_HEIGHT, tall: true, zoom: h / VIEW_HEIGHT };
  }
  const fit = Math.min(w / VIEW_WIDTH, h / VIEW_HEIGHT);
  return { viewW: VIEW_WIDTH, viewH: VIEW_HEIGHT, tall: false, zoom: fit };
}

/**
 * Manual CSS layout for Phaser.Scale.NONE.
 * Tall: canvas fills parent (same framing as production). Wide: FIT letterbox.
 * Framebuffer stays 1:1; CSS may be fractional. `image-rendering: pixelated`.
 */
export function layoutHarborCanvas(
  parent: HTMLElement,
  canvas: HTMLCanvasElement,
  viewW: number = VIEW_WIDTH,
  viewH: number = VIEW_HEIGHT,
): void {
  const parentW = Math.max(1, parent.clientWidth || window.innerWidth || 1);
  const parentH = Math.max(1, parent.clientHeight || window.innerHeight || 1);
  const tall = parentIsTall(parentW, parentH);

  let cssW: number;
  let cssH: number;
  if (tall) {
    cssW = parentW;
    cssH = parentH;
  } else {
    const zoom = Math.min(parentW / viewW, parentH / viewH);
    cssW = viewW * zoom;
    cssH = viewH * zoom;
  }

  canvas.style.position = "absolute";
  canvas.style.left = "50%";
  canvas.style.top = "50%";
  canvas.style.transform = "translate(-50%, -50%)";
  canvas.style.width = `${Math.round(cssW)}px`;
  canvas.style.height = `${Math.round(cssH)}px`;
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.margin = "0";
  canvas.style.imageRendering = "pixelated";
  parent.style.overflow = "hidden";
}
