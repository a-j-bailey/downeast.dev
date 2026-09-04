import Phaser from "phaser";
import { artUrl } from "../assets";
import { applyHudCamera } from "../camera";
import { EventBus } from "../EventBus";

type InteriorData = { id?: string };

export class InteriorScene extends Phaser.Scene {
  private leaving = false;
  private postcard?: Phaser.GameObjects.Image;

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

    this.input.keyboard?.on("keydown-ESC", this.onLeaveKey);
    this.input.keyboard?.on("keydown-E", this.onLeaveKey);
    EventBus.on("harbor-interact", this.onInteract);
    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", () => {
      EventBus.off("harbor-interact", this.onInteract);
      this.scale.off("resize", this.onResize, this);
      this.input.keyboard?.off("keydown-ESC", this.onLeaveKey);
      this.input.keyboard?.off("keydown-E", this.onLeaveKey);
    });
  }

  private onLeaveKey = (): void => {
    this.leave();
  };

  private onInteract = (): void => {
    this.leave();
  };

  private onResize = (): void => {
    if (!this.sys.isActive()) {
      return;
    }
    this.layoutPostcard();
  };

  private placeInterior(): void {
    if (!this.textures.exists("cafe-interior") || this.postcard) {
      this.layoutPostcard();
      return;
    }
    this.postcard = this.add.image(0, 0, "cafe-interior");
    this.postcard.setScrollFactor(0);
    this.layoutPostcard();
  }

  private layoutPostcard(): void {
    const view = applyHudCamera(this);
    if (!this.postcard) {
      return;
    }
    const frame = this.postcard.frame;
    const fit = Math.min(view.width / frame.width, view.height / frame.height);
    const scale = Math.max(1, Math.floor(fit + 1e-6));
    this.postcard.setPosition(Math.floor(view.width / 2), Math.floor(view.height / 2));
    this.postcard.setScale(scale);
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
