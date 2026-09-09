import Phaser from "phaser";
import { SCROLL } from "./layers";
import { CORMORANT, DOCK_DEPTH, WATER_SURFACE_Y, WORLD_MAX_X, WORLD_MIN_X } from "./layout";
import type { WeatherMood } from "./weather";

type CormorantPose = "perch" | "wings" | "idle";

function poseTexture(pose: CormorantPose): string {
  switch (pose) {
    case "perch":
      return "cormorant-perch";
    case "wings":
      return "cormorant-wings";
    case "idle":
      return "cormorant-idle";
    default: {
      const _exhaustive: never = pose;
      return _exhaustive;
    }
  }
}

function isDayMood(mood: WeatherMood): boolean {
  return mood !== "night";
}

/** Occasional shark-fin crossing and a day-perched cormorant. */
export class AmbientCritters {
  private scene: Phaser.Scene;
  private shark?: Phaser.GameObjects.Image;
  private sharkDir = 1;
  private cormorant?: Phaser.GameObjects.Image;
  private pose: CormorantPose = "perch";
  private poseHold = 0;
  private mood: WeatherMood = "clearDay";

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.poseHold = 3.2 + Math.random() * 2.4;
  }

  spawnShark(): void {
    if (this.shark || !this.scene.textures.exists("shark-fin")) {
      return;
    }
    this.sharkDir = Math.random() > 0.5 ? 1 : -1;
    const x = this.sharkDir > 0 ? WORLD_MIN_X + 40 : WORLD_MAX_X - 40;
    const y = WATER_SURFACE_Y + 20 + Math.random() * 18;
    this.shark = this.scene.add.image(x, y, "shark-fin");
    this.shark.setOrigin(0.5, 1);
    this.shark.setScrollFactor(SCROLL.actors);
    this.shark.setDepth(y);
    // Fin art faces LEFT, same as the hull — flip only when swimming right.
    this.shark.setFlipX(this.sharkDir > 0);
    this.shark.x = Math.round(this.shark.x);
    this.shark.y = Math.round(this.shark.y);
    this.shark.setLighting(true);
  }

  ensure(mood: WeatherMood): void {
    this.mood = mood;
    this.ensureCormorant();
  }

  update(dt: number): void {
    this.updateShark(dt);
    this.updateCormorant(dt);
  }

  private ensureCormorant(): void {
    if (!this.scene.textures.exists("cormorant-perch")) {
      return;
    }
    if (!this.cormorant) {
      this.cormorant = this.scene.add.image(CORMORANT.x, CORMORANT.y, poseTexture(this.pose));
      this.cormorant.setName("cormorant");
      this.cormorant.setOrigin(0.5, 1);
      this.cormorant.setScrollFactor(SCROLL.land);
      this.cormorant.setDepth(DOCK_DEPTH + 3);
      this.cormorant.setLighting(true);
    }
    this.cormorant.setVisible(isDayMood(this.mood));
  }

  private updateShark(dt: number): void {
    if (!this.shark) {
      return;
    }
    this.shark.x += this.sharkDir * 28 * dt;
    this.shark.x = Math.round(this.shark.x);
    this.shark.setDepth(this.shark.y);
    if (this.shark.x < WORLD_MIN_X - 40 || this.shark.x > WORLD_MAX_X + 40) {
      this.shark.destroy();
      this.shark = undefined;
    }
  }

  private updateCormorant(dt: number): void {
    if (!this.cormorant || !this.cormorant.visible) {
      return;
    }
    this.poseHold -= dt;
    if (this.poseHold > 0) {
      return;
    }
    this.pose = this.nextPose(this.pose);
    const key = poseTexture(this.pose);
    if (this.scene.textures.exists(key)) {
      this.cormorant.setTexture(key);
    }
    this.poseHold = this.holdFor(this.pose);
  }

  private nextPose(current: CormorantPose): CormorantPose {
    switch (current) {
      case "perch":
        return Math.random() < 0.7 ? "wings" : "idle";
      case "wings":
      case "idle":
        return "perch";
      default: {
        const _exhaustive: never = current;
        return _exhaustive;
      }
    }
  }

  private holdFor(pose: CormorantPose): number {
    switch (pose) {
      case "perch":
        return 6 + Math.random() * 8;
      case "wings":
        return 2.8 + Math.random() * 2.2;
      case "idle":
        return 1.4 + Math.random() * 1.2;
      default: {
        const _exhaustive: never = pose;
        return _exhaustive;
      }
    }
  }
}
