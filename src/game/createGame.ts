import Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";
import { computeHarborView, layoutHarborCanvas } from "./scaleMode";
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
      // Camera height stays 270. Tall phones shrink width via resize below.
      // Never EXPAND / MAX_ZOOM / grow camera from scale.height.
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      autoRound: true,
    },
    scene: [BootScene, HarborScene, InteriorScene, HudScene],
  });

  const syncLayout = (): void => {
    if (!game.canvas) {
      return;
    }
    const parentW = Math.max(1, parent.clientWidth || window.innerWidth || 1);
    const parentH = Math.max(1, parent.clientHeight || window.innerHeight || 1);
    const { viewW, viewH } = computeHarborView(parentW, parentH);
    if (Math.round(game.scale.width) !== viewW || Math.round(game.scale.height) !== viewH) {
      game.scale.resize(viewW, viewH);
    }
    layoutHarborCanvas(parent, game.canvas, viewW, viewH);
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
