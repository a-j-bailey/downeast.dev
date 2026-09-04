import Phaser from "phaser";
import { SCROLL } from "./layers";
import { WATER_SURFACE_Y, WORLD_WIDTH } from "./layout";

/** Occasional shark-fin crossing. */
export class AmbientCritters {
  private scene: Phaser.Scene;
  private shark?: Phaser.GameObjects.Image;
  private sharkDir = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawnShark(): void {
    if (this.shark || !this.scene.textures.exists("shark-fin")) {
      return;
    }
    this.sharkDir = Math.random() > 0.5 ? 1 : -1;
    const x = this.sharkDir > 0 ? 40 : WORLD_WIDTH - 40;
    const y = WATER_SURFACE_Y + 20 + Math.random() * 18;
    this.shark = this.scene.add.image(x, y, "shark-fin");
    this.shark.setOrigin(0.5, 1);
    this.shark.setScrollFactor(SCROLL.actors);
    this.shark.setDepth(y);
    this.shark.setFlipX(this.sharkDir < 0);
    this.shark.setLighting(true);
  }

  update(dt: number): void {
    if (!this.shark) {
      return;
    }
    this.shark.x += this.sharkDir * 28 * dt;
    this.shark.setDepth(this.shark.y);
    if (this.shark.x < -40 || this.shark.x > WORLD_WIDTH + 40) {
      this.shark.destroy();
      this.shark = undefined;
    }
  }
}
