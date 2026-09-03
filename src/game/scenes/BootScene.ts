import Phaser from "phaser";
import { BOOT_IMAGES, artUrl } from "../assets";
import { applyHudCamera } from "../camera";
import { EventBus } from "../EventBus";
import { ensureUiTextures } from "../textures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "Boot" });
  }

  create(): void {
    ensureUiTextures(this);
    this.drawLoader(0);

    this.load.on("progress", (value: number) => {
      this.drawLoader(value);
    });
    this.load.once("complete", () => {
      EventBus.emit("current-scene-ready", this);
      this.scene.start("Harbor");
      this.scene.launch("Hud");
      this.scene.bringToTop("Hud");
    });

    for (const key of BOOT_IMAGES) {
      this.load.image(key, artUrl(key));
    }
    this.load.start();
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.onResize, this);
    });
    this.scale.on("resize", this.onResize, this);
  }

  private onResize = (): void => {
    if (!this.sys.isActive()) {
      return;
    }
    this.drawLoader(this.load.progress);
  };

  private drawLoader(progress: number): void {
    const view = applyHudCamera(this);
    const w = view.width;
    const h = view.height;
    let bar = this.children.getByName("boot-bar") as Phaser.GameObjects.Graphics | null;
    if (!bar) {
      bar = this.add.graphics().setName("boot-bar").setScrollFactor(0);
      this.add
        .rectangle(w / 2, h / 2, 4, 4, 0xfffcf0)
        .setName("boot-pixel")
        .setScrollFactor(0);
    }
    const pixel = this.children.getByName("boot-pixel") as Phaser.GameObjects.Rectangle | null;
    pixel?.setPosition(Math.floor(w / 2), Math.floor(h / 2));
    bar.clear();
    bar.fillStyle(0x100f0f, 1);
    bar.fillRect(Math.floor(w / 2) - 22, Math.floor(h / 2) + 10, 44, 6);
    bar.fillStyle(0xfffcf0, 1);
    bar.fillRect(
      Math.floor(w / 2) - 20,
      Math.floor(h / 2) + 12,
      Math.max(1, Math.floor(40 * progress)),
      2,
    );
  }
}
