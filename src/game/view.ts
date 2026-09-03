/** Logical design view. Extra world is shown on larger/wider screens. */
export const VIEW_WIDTH = 480;
export const VIEW_HEIGHT = 270;

export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 270;

export function integerZoom(parentWidth: number, parentHeight: number): number {
  void parentWidth;
  return Math.max(1, Math.floor(parentHeight / VIEW_HEIGHT));
}

export function visibleSize(
  parentWidth: number,
  parentHeight: number,
): { zoom: number; width: number; height: number } {
  const zoom = integerZoom(parentWidth, parentHeight);
  return {
    zoom,
    width: Math.max(1, Math.ceil(parentWidth / zoom)),
    height: Math.max(1, Math.ceil(parentHeight / zoom)),
  };
}
