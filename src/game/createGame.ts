import Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";
import { layoutHarborCanvas } from "./scaleMode";
import { BootScene } from "./scenes/BootScene";
import { HarborScene } from "./scenes/HarborScene";
import { HudScene } from "./scenes/HudScene";
import { InteriorScene } from "./scenes/InteriorScene";

export function createHarborGame(parent: HTMLElement): Phaser.Game {
  parent.style.overflow = "hidden";

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
    input: {
      keyboard: true,
    },
    render: {
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      antialiasGL: false,
    },
    scale: {
      // Camera stays 480×270 (see camera.ts). Manual CSS resize below.
      // Never EXPAND / MAX_ZOOM / grow camera from scale.height.
      // ENVELOP / HEIGHT_CONTROLS via scaleMode assignment proved unreliable.
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
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

  const syncLayout = (): void => {
    if (!game.canvas) {
      return;
    }
    layoutHarborCanvas(parent, game.canvas);
    if (game.canvas.tabIndex < 0) {
      game.canvas.tabIndex = 0;
    }
  };

  const onReady = (): void => {
    syncLayout();
    // Phaser may apply its own canvas styles once after boot — re-apply.
    requestAnimationFrame(syncLayout);
  };

  if (game.isBooted) {
    onReady();
  } else {
    game.events.once("ready", onReady);
  }

  window.addEventListener("resize", syncLayout);
  const ro =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => syncLayout()) : null;
  ro?.observe(parent);

  game.events.once("destroy", () => {
    window.removeEventListener("resize", syncLayout);
    ro?.disconnect();
  });

  return game;
}
