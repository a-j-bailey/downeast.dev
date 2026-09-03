import Phaser from "phaser";
import { artUrl } from "../assets";
import { applyHudCamera } from "../camera";
import { EventBus } from "../EventBus";

type InteriorData = { id?: string };

export class InteriorScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super({ key: "Interior" });
  }

  preload(): void {
    if (!this.textures.exists("cafe-interior")) {
      this.load.image("cafe-interior", artUrl("cafe-interior"));
    }
  }

  create(data: InteriorData): void {
    void data;
    applyHudCamera(this);
    this.cameras.main.setBackgroundColor("#1c140e");
    this.cameras.main.fadeIn(220, 0, 0, 0);

    if (this.textures.exists("cafe-interior")) {
      this.placeInterior();
    } else {
      this.load.once("complete", () => this.placeInterior());
    }

    EventBus.emit("harbor-prompt", "leave");

    this.input.keyboard?.on("keydown-ESC", () => this.leave());
    this.input.keyboard?.on("keydown-E", () => this.leave());
    this.input.on("pointerdown", () => this.leave());
    EventBus.on("harbor-interact", this.onInteract);
    this.events.once("shutdown", () => {
      EventBus.off("harbor-interact", this.onInteract);
    });
  }

  private onInteract = (): void => {
    this.leave();
  };

  private placeInterior(): void {
    if (!this.textures.exists("cafe-interior")) {
      return;
    }
    const view = applyHudCamera(this);
    const image = this.add.image(view.width / 2, view.height / 2, "cafe-interior");
    const scale = Math.min(view.width / image.width, view.height / image.height);
    image.setScale(scale);
    image.setScrollFactor(0);
  }

  private leave(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    EventBus.off("harbor-interact", this.onInteract);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      EventBus.emit("harbor-prompt", null);
      this.scene.stop();
      this.scene.resume("Harbor");
      const harbor = this.scene.get("Harbor");
      harbor.cameras.main.fadeIn(220, 0, 0, 0);
    });
  }
}
