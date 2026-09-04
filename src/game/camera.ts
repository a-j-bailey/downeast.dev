import type Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "./view";

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
  cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  cam.setSize(view.width, view.height);
  if (follow) {
    // Keep roughly the top third as sky for the wordmark.
    const skyPad = Math.round(VIEW_HEIGHT / 3 - 24);
    // Hard follow on X (lerp 1) so scroll stays integer — smooth 0.12 lerp
    // made buildings/signs shimmer while walking.
    cam.startFollow(follow, true, 1, 1);
    cam.setFollowOffset(0, -skyPad);
    cam.setDeadzone(Math.round(view.width / 5), Math.round(VIEW_HEIGHT / 8));
  }
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
