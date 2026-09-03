import type Phaser from "phaser";
import { VIEW_HEIGHT, WORLD_HEIGHT, WORLD_WIDTH } from "./view";

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
  const viewH = scene.scale.height || VIEW_HEIGHT;
  const boundY = Math.min(0, WORLD_HEIGHT - viewH);
  cam.setBounds(0, boundY, WORLD_WIDTH, Math.max(WORLD_HEIGHT, viewH));
  if (follow) {
    const skyPad = Math.round(viewH / 3 - 24);
    cam.startFollow(follow, true, 0.12, 0.12);
    cam.setFollowOffset(0, -skyPad);
    cam.setDeadzone(Math.round((scene.scale.width || 480) / 6), Math.round(viewH / 8));
  }
}

export function applyHudCamera(scene: Phaser.Scene): {
  zoom: number;
  width: number;
  height: number;
} {
  const cam = mainCamera(scene);
  const width = Math.max(1, Math.floor(scene.scale.width || 480));
  const height = Math.max(1, Math.floor(scene.scale.height || 270));
  if (cam) {
    cam.setRoundPixels(true);
    cam.setScroll(0, 0);
  }
  return { zoom: 1, width, height };
}
