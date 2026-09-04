import Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";
import { applyResponsiveScale } from "./scaleMode";
import { BootScene } from "./scenes/BootScene";
import { HarborScene } from "./scenes/HarborScene";
import { HudScene } from "./scenes/HudScene";
import { InteriorScene } from "./scenes/InteriorScene";

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
      mode: Phaser.Scale.FIT,
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
    if (!game.scale) {
      return;
    }
    applyResponsiveScale(game);
  };

  game.scale.on("resize", syncScaleMode);
  window.addEventListener("resize", syncScaleMode);
  game.events.once("ready", syncScaleMode);
  game.events.once("destroy", () => {
    game.scale.off("resize", syncScaleMode);
    window.removeEventListener("resize", syncScaleMode);
  });

  return game;
}
