import type Phaser from "phaser";
import { PLACES, SEAWALL_LEFT_X } from "./layout";
import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_HEIGHT,
  WORLD_MIN_X,
  WORLD_SPAN,
} from "./view";

type PixelObj = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  scrollFactorX: number;
  setScrollFactor: (value: number) => unknown;
};

function mainCamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera | undefined {
  const manager = scene.cameras;
  if (!manager) {
    return undefined;
  }
  return manager.main ?? manager.cameras[0];
}

/** Visible size: height always VIEW_HEIGHT; width may shrink on tall phones. */
export function harborViewSize(scene: Phaser.Scene): { width: number; height: number } {
  const w = Math.round(scene.scale.width) || VIEW_WIDTH;
  return {
    width: Math.max(200, Math.min(VIEW_WIDTH, w)),
    height: VIEW_HEIGHT,
  };
}

export function applyHarborCamera(
  scene: Phaser.Scene,
  follow?: Phaser.GameObjects.GameObject,
): void {
  const cam = mainCamera(scene);
  if (!cam) {
    return;
  }
  const view = harborViewSize(scene);
  cam.setRoundPixels(true);
  // Height stays 270 — never grow with phone CSS height (parallax tear).
  cam.setBounds(WORLD_MIN_X, 0, WORLD_SPAN, WORLD_HEIGHT);
  cam.setSize(view.width, view.height);
  if (follow) {
    // Hard follow on X (lerp 1) so scroll stays integer — smooth 0.12 lerp
    // made buildings/signs shimmer while walking.
    cam.startFollow(follow, true, 1, 1);
    cam.setDeadzone(Math.round(view.width / 5), Math.round(VIEW_HEIGHT / 8));
    syncHarborFollowOffset(scene, follow);
  }
}

function followWorldX(follow: Phaser.GameObjects.GameObject): number | undefined {
  const x = (follow as { x?: unknown }).x;
  return typeof x === "number" ? x : undefined;
}

/**
 * At the finger-dock, bias the camera seaward so a 200-wide phone view
 * shows water past the bow instead of cropping the stem.
 */
export function syncHarborFollowOffset(
  scene: Phaser.Scene,
  follow?: Phaser.GameObjects.GameObject,
): void {
  const cam = mainCamera(scene);
  if (!cam || !follow) {
    return;
  }
  const skyPad = Math.round(VIEW_HEIGHT / 3 - 24);
  const fx = followWorldX(follow);
  const atBerth =
    typeof fx === "number" && fx < SEAWALL_LEFT_X + 40 && fx > PLACES.boat.x - 80;
  const isBoat = follow.name === "boat";
  const view = harborViewSize(scene);
  // 171px hull in a 200-wide phone view cannot afford a 40px deadzone
  // or the bow clips while cruising.
  cam.setDeadzone(
    isBoat ? 0 : Math.round(view.width / 5),
    Math.round(VIEW_HEIGHT / 8),
  );
  const facingRight = Boolean((follow as { flipX?: boolean }).flipX);
  let look = 0;
  if (isBoat) {
    // Bias toward the bow so a 171px hull keeps water ahead in a 200-wide view.
    look = facingRight ? -8 : 8;
  } else if (atBerth) {
    look = 18;
  }
  cam.setFollowOffset(look, -skyPad);
}

/** Snap camera scroll to whole pixels after follow — kills prop shimmer. */
export function snapHarborCamera(scene: Phaser.Scene): void {
  const cam = mainCamera(scene);
  if (!cam) {
    return;
  }
  cam.scrollX = Math.round(cam.scrollX);
  cam.scrollY = Math.round(cam.scrollY);
}

/** Store integer world home + original scrollFactor for parallax snap. */
export function setPixelHome(obj: PixelObj): void {
  obj.setData("pixelX", Math.round(obj.x));
  obj.setData("pixelY", Math.round(obj.y));
  if (typeof obj.getData("pixelSf") !== "number") {
    obj.setData("pixelSf", obj.scrollFactorX);
  }
}

function isPixelObj(child: Phaser.GameObjects.GameObject): child is PixelObj {
  return typeof (child as PixelObj).x === "number" && typeof (child as PixelObj).y === "number";
}

/**
 * Round camera scroll and sprite positions after follow.
 * Fractional-scrollFactor layers are drawn at
 * `round(home + scroll * (1 - sf))` with display scrollFactor 1 so tiles
 * don't shimmer.
 */
export function snapPixelWorld(scene: Phaser.Scene): void {
  const cam = mainCamera(scene);
  if (!cam) {
    return;
  }
  cam.roundPixels = true;
  cam.scrollX = Math.round(cam.scrollX);
  cam.scrollY = Math.round(cam.scrollY);
  const sx = cam.scrollX;
  const sy = cam.scrollY;
  for (const child of scene.children.list) {
    if (!isPixelObj(child)) {
      continue;
    }
    const sf = child.getData("pixelSf");
    if (typeof sf === "number" && sf > 0 && sf < 1) {
      const hx = child.getData("pixelX");
      const hy = child.getData("pixelY");
      if (typeof hx === "number" && typeof hy === "number") {
        child.setScrollFactor(1);
        child.x = Math.round(hx + sx * (1 - sf));
        child.y = Math.round(hy + sy * (1 - sf));
        continue;
      }
    }
    child.x = Math.round(child.x);
    child.y = Math.round(child.y);
  }
}

/** Snap after Camera#follow so integer scroll isn't overwritten. */
export function bindPixelSnap(scene: Phaser.Scene): void {
  const onPreRender = (): void => {
    snapPixelWorld(scene);
  };
  scene.events.on("prerender", onPreRender);
  scene.events.once("shutdown", () => {
    scene.events.off("prerender", onPreRender);
  });
}

export function applyHudCamera(scene: Phaser.Scene): {
  zoom: number;
  width: number;
  height: number;
} {
  const cam = mainCamera(scene);
  const view = harborViewSize(scene);
  if (cam) {
    cam.setRoundPixels(true);
    cam.setScroll(0, 0);
    cam.setSize(view.width, view.height);
  }
  return { zoom: 1, width: view.width, height: view.height };
}
