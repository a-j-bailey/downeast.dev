import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";

/** Portrait-ish: fill height and crop sides. Landscape: FIT. */
export const TALL_ASPECT = 1.5;

export function parentIsTall(width: number, height: number): boolean {
  return height > 0 && width / height < TALL_ASPECT;
}

/**
 * Manual CSS layout for Phaser.Scale.NONE.
 * Camera stays 480×270 — never grow with phone CSS height.
 * Tall: zoom = parentH/270, fill height, crop sides.
 * Wide: FIT (letterbox both axes).
 */
export function layoutHarborCanvas(parent: HTMLElement, canvas: HTMLCanvasElement): void {
  const parentW = Math.max(1, parent.clientWidth || window.innerWidth || 1);
  const parentH = Math.max(1, parent.clientHeight || window.innerHeight || 1);
  const tall = parentIsTall(parentW, parentH);

  let cssW: number;
  let cssH: number;
  if (tall) {
    const zoom = parentH / VIEW_HEIGHT;
    cssH = parentH;
    cssW = VIEW_WIDTH * zoom;
  } else {
    const zoom = Math.min(parentW / VIEW_WIDTH, parentH / VIEW_HEIGHT);
    cssW = VIEW_WIDTH * zoom;
    cssH = VIEW_HEIGHT * zoom;
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
}
