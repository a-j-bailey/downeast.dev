import Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";
import { BootScene } from "./scenes/BootScene";
import { HarborScene } from "./scenes/HarborScene";
import { HudScene } from "./scenes/HudScene";
import { InteriorScene } from "./scenes/InteriorScene";

/** Tall phones: ENVELOP (fill height, crop sides). Wide: FIT (letterbox). */
function scaleModeForParent(parent: HTMLElement): number {
  const w = parent.clientWidth || window.innerWidth || 1;
  const h = parent.clientHeight || window.innerHeight || 1;
  return w / h < 1.5 ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;
}

export function createHarborGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    backgroundColor: "#5b93c5",
    banner: false,
    audio: { noAudio: true },
    pixelArt: true,
    roundPixels: true,
    render: {
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      antialiasGL: false,
    },
    scale: {
      // Camera stays 480×270 (see camera.ts). Never EXPAND / MAX_ZOOM.
      mode: scaleModeForParent(parent),
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, HarborScene, InteriorScene, HudScene],
  });

  const syncScaleMode = (): void => {
    if (!game.scale || !game.canvas) {
      return;
    }
    const next = scaleModeForParent(parent);
    if (game.scale.scaleMode !== next) {
      game.scale.scaleMode = next;
      game.scale.refresh();
    }
  };

  game.scale.on("resize", syncScaleMode);
  window.addEventListener("resize", syncScaleMode);
  game.events.once("destroy", () => {
    window.removeEventListener("resize", syncScaleMode);
  });

  return game;
}
