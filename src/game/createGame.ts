import Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";
import { BootScene } from "./scenes/BootScene";
import { HarborScene } from "./scenes/HarborScene";
import { HudScene } from "./scenes/HudScene";
import { InteriorScene } from "./scenes/InteriorScene";

export function createHarborGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
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
      // RESIZE + integer camera zoom: fills the viewport, keeps 1:1 pixels,
      // and shows extra harbor on wide screens. FIT + MAX_ZOOM letterboxes.
      mode: Phaser.Scale.RESIZE,
      autoRound: true,
      expandParent: false,
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
}
