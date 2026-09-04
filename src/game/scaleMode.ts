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
  zoom: number;
};

/**
 * Logical framebuffer + integer CSS zoom.
 * Height stays 270. Tall/mobile covers the parent (crop overflow) so pixels
 * stay square; landscape FIT-floors so we never stretch a fractional zoom.
 */
export function computeHarborView(parentW: number, parentH: number): HarborView {
  const w = Math.max(1, parentW);
  const h = Math.max(1, parentH);
  const tall = parentIsTall(w, h);
  if (tall) {
    let zoom = Math.max(1, Math.round(h / VIEW_HEIGHT));
    if ((VIEW_HEIGHT * zoom) / h < 0.9) {
      zoom += 1;
    }
    const viewW = clamp(Math.round(w / zoom), 200, VIEW_WIDTH);
    return { viewW, viewH: VIEW_HEIGHT, tall: true, zoom };
  }
  const fit = Math.min(w / VIEW_WIDTH, h / VIEW_HEIGHT);
  const zoom = Math.max(1, Math.floor(fit + 1e-6));
  return { viewW: VIEW_WIDTH, viewH: VIEW_HEIGHT, tall: false, zoom };
}

/**
 * Manual CSS layout for Phaser.Scale.NONE.
 * css size is always view × integer zoom — never a mushy stretch to the parent.
 */
export function layoutHarborCanvas(
  parent: HTMLElement,
  canvas: HTMLCanvasElement,
  viewW: number = VIEW_WIDTH,
  viewH: number = VIEW_HEIGHT,
  zoom: number = 1,
): void {
  const z = Math.max(1, Math.round(zoom));
  const cssW = viewW * z;
  const cssH = viewH * z;

  canvas.style.position = "absolute";
  canvas.style.left = "50%";
  canvas.style.top = "50%";
  canvas.style.transform = "translate(-50%, -50%)";
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.margin = "0";
  canvas.style.imageRendering = "pixelated";
  parent.style.overflow = "hidden";
}
