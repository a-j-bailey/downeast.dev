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
      // FIT keeps the 480×270 world composed. EXPAND on tall phones tore
      // parallax layers apart by growing the camera taller than the world.
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
}
