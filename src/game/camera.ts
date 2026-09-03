import type Phaser from "phaser";
import { VIEW_HEIGHT, WORLD_HEIGHT, WORLD_WIDTH, integerZoom } from "./view";

export function applyHarborCamera(
  scene: Phaser.Scene,
  follow?: Phaser.GameObjects.GameObject,
): void {
  const zoom = integerZoom(scene.scale.width, scene.scale.height);
  const visibleH = Math.max(1, Math.ceil(scene.scale.height / zoom));
  const cam = scene.cameras.main;
  cam.setZoom(zoom);
  cam.setRoundPixels(true);
  const boundY = Math.min(0, WORLD_HEIGHT - visibleH);
  cam.setBounds(0, boundY, WORLD_WIDTH, Math.max(WORLD_HEIGHT, visibleH));
  if (follow) {
    const skyPad = Math.round(visibleH / 3 - 24);
    cam.startFollow(follow, true, 0.12, 0.12);
    cam.setFollowOffset(0, -skyPad);
    cam.setDeadzone(Math.round(scene.scale.width / zoom / 6), Math.round(visibleH / 8));
  }
}

export function applyHudCamera(scene: Phaser.Scene): {
  zoom: number;
  width: number;
  height: number;
} {
  const zoom = integerZoom(scene.scale.width, scene.scale.height);
  const width = Math.max(1, Math.ceil(scene.scale.width / zoom));
  const height = Math.max(1, Math.ceil(scene.scale.height / zoom));
  const cam = scene.cameras.main;
  cam.setZoom(zoom);
  cam.setRoundPixels(true);
  cam.centerOn(width / 2, height / 2);
  cam.setScroll(0, 0);
  void VIEW_HEIGHT;
  return { zoom, width, height };
}
