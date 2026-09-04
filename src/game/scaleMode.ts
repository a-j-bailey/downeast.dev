import Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";

/** Portrait-ish: fill height and crop sides. Landscape: FIT. */
export const TALL_ASPECT = 1.5;

export function parentIsTall(width: number, height: number): boolean {
  return height > 0 && width / height < TALL_ASPECT;
}

/**
 * Tall parent: HEIGHT_CONTROLS_WIDTH so 480×270 fills phone height and crops
 * sides. Wide: FIT + CENTER_BOTH. Never EXPAND — that grows the camera.
 */
export function applyResponsiveScale(game: Phaser.Game): void {
  const parent = game.scale.parent as HTMLElement | null;
  const pw = parent?.clientWidth || game.scale.parentSize.width;
  const ph = parent?.clientHeight || game.scale.parentSize.height;
  const mode = parentIsTall(pw, ph)
    ? Phaser.Scale.HEIGHT_CONTROLS_WIDTH
    : Phaser.Scale.FIT;
  const center = Phaser.Scale.CENTER_BOTH;
  const changed = game.scale.scaleMode !== mode || game.scale.autoCenter !== center;
  game.scale.scaleMode = mode;
  game.scale.autoCenter = center;
  if (changed && mode !== Phaser.Scale.RESIZE && mode !== Phaser.Scale.EXPAND) {
    game.scale.displaySize.setAspectMode(mode);
  }
  if (game.scale.gameSize.width !== VIEW_WIDTH || game.scale.gameSize.height !== VIEW_HEIGHT) {
    game.scale.setGameSize(VIEW_WIDTH, VIEW_HEIGHT);
  } else if (changed) {
    game.scale.refresh();
  }
}
