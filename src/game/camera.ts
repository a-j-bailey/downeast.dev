import type Phaser from "phaser";
import { VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "./view";

function mainCamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera | undefined {
  const manager = scene.cameras;
  if (!manager) {
    return undefined;
  }
  return manager.main ?? manager.cameras[0];
}

export function applyHarborCamera(
  scene: Phaser.Scene,
  follow?: Phaser.GameObjects.GameObject,
): void {
  const cam = mainCamera(scene);
  if (!cam) {
    return;
  }
  cam.setRoundPixels(true);
  // Always frame the designed 480×270 world. Never use the CSS pixel size of
  // a tall phone as the camera height — that is what split the layers.
  cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  cam.setSize(VIEW_WIDTH, VIEW_HEIGHT);
  if (follow) {
    // Keep roughly the top third as sky for the wordmark.
    const skyPad = Math.round(VIEW_HEIGHT / 3 - 24);
    cam.startFollow(follow, true, 0.12, 0.12);
    cam.setFollowOffset(0, -skyPad);
    cam.setDeadzone(Math.round(VIEW_WIDTH / 6), Math.round(VIEW_HEIGHT / 8));
  }
}

export function applyHudCamera(scene: Phaser.Scene): {
  zoom: number;
  width: number;
  height: number;
} {
  const cam = mainCamera(scene);
  if (cam) {
    cam.setRoundPixels(true);
    cam.setScroll(0, 0);
    cam.setSize(VIEW_WIDTH, VIEW_HEIGHT);
  }
  return { zoom: 1, width: VIEW_WIDTH, height: VIEW_HEIGHT };
}
