import Phaser from "phaser";
import { artUrl } from "../assets";
import { applyHudCamera } from "../camera";
import { EventBus } from "../EventBus";

type InteriorData = { id?: string };

export class InteriorScene extends Phaser.Scene {
  private leaving = false;
  private allowELeave = false;
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

    const keyboard = this.input.keyboard;
    if (keyboard) {
      const eKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.allowELeave = !eKey.isDown;
      keyboard.on("keydown-ESC", this.onLeaveKey);
      keyboard.on("keydown-E", this.onLeaveE);
      keyboard.on("keyup-E", this.onEUp);
    }
    EventBus.on("harbor-interact", this.onInteract);
    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", () => {
      EventBus.off("harbor-interact", this.onInteract);
      this.scale.off("resize", this.onResize, this);
      this.input.keyboard?.off("keydown-ESC", this.onLeaveKey);
      this.input.keyboard?.off("keydown-E", this.onLeaveE);
      this.input.keyboard?.off("keyup-E", this.onEUp);
    });
  }

  private onLeaveKey = (): void => {
    this.leave();
  };

  private onLeaveE = (): void => {
    if (!this.allowELeave) {
      return;
    }
    this.leave();
  };

  private onEUp = (): void => {
    this.allowELeave = true;
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
    const scale = Math.min(view.width / frame.width, view.height / frame.height);
    this.postcard.setPosition(view.width / 2, view.height / 2);
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
