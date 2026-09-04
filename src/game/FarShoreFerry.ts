import Phaser from "phaser";
import { activeCrossing, bowFacesRight, ferryForced, type Terminal } from "./ferrySchedule";
import { SCROLL } from "./layers";
import { WATER_SURFACE_Y, WORLD_WIDTH } from "./layout";
import type { WeatherMood } from "./weather";

const FORCE_CROSSING_SEC = 24;
const KEEL_Y = WATER_SURFACE_Y + 4;
const MARGIN = 48;
const DEPTH = 14;
const LAYER = SCROLL.farShore;

/** Distant Prudence Island ferry on the far-shore water lane. */
export class FarShoreFerry {
  private scene: Phaser.Scene;
  private sprite?: Phaser.GameObjects.Image;
  private force: boolean;
  private forceElapsed = 0;

  constructor(scene: Phaser.Scene, search = window.location.search) {
    this.scene = scene;
    this.force = ferryForced(search);
  }

  place(): void {
    if (this.sprite || !this.scene.textures.exists("prudence-ferry")) {
      return;
    }
    this.sprite = this.scene.add.image(WORLD_WIDTH / 2, KEEL_Y, "prudence-ferry");
    this.sprite.setName("prudence-ferry");
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScrollFactor(LAYER);
    this.sprite.setDepth(DEPTH);
    this.sprite.setLighting(true);
    this.sprite.setVisible(false);
  }

  update(dt: number, mood: WeatherMood): void {
    this.place();
    if (!this.sprite) {
      return;
    }
    if (mood === "fog" && !this.force) {
      this.sprite.setVisible(false);
      return;
    }

    if (this.force) {
      this.forceElapsed += dt;
      const cycle = FORCE_CROSSING_SEC * 2;
      const t = this.forceElapsed % cycle;
      const outbound = t < FORCE_CROSSING_SEC;
      const progress = outbound ? t / FORCE_CROSSING_SEC : (t - FORCE_CROSSING_SEC) / FORCE_CROSSING_SEC;
      this.layout(outbound ? "bristol" : "prudence", progress);
      this.sprite.setVisible(true);
      return;
    }

    const crossing = activeCrossing();
    if (!crossing) {
      this.sprite.setVisible(false);
      return;
    }
    this.layout(crossing.from, crossing.progress);
    this.sprite.setVisible(true);
  }

  private layout(from: Terminal, progress: number): void {
    if (!this.sprite) {
      return;
    }
    const p = Phaser.Math.Clamp(progress, 0, 1);
    const right = bowFacesRight(from);
    const x0 = MARGIN;
    const x1 = WORLD_WIDTH - MARGIN;
    const worldX = right ? x0 + (x1 - x0) * p : x1 - (x1 - x0) * p;
    this.sprite.setPosition(Math.round(worldX), KEEL_Y);
    this.sprite.setFlipX(!right);
    this.sprite.setDepth(DEPTH);
  }
}
