import Phaser from "phaser";
import { activeCrossing, bowFacesRight, ferryForced, type Terminal } from "./ferrySchedule";
import { SCROLL } from "./layers";
import { WATER_SURFACE_Y, WORLD_WIDTH } from "./layout";
import type { WeatherMood } from "./weather";

/** One-way `?ferry=1` crossing. Real Bristol↔Prudence runs are 30 minutes. */
export const FORCE_CROSSING_SEC = 90;
const KEEL_Y = WATER_SURFACE_Y + 4;
const MARGIN = 48;
const DEPTH = 14;
const LAYER = SCROLL.farShore;
const CABIN_OY = -11;

/** Distant Prudence Island ferry on the far-shore water lane. */
export class FarShoreFerry {
  private scene: Phaser.Scene;
  private sprite?: Phaser.GameObjects.Image;
  private cabinGlow?: Phaser.GameObjects.Image;
  private cabinLight?: Phaser.GameObjects.Light;
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

    if (this.scene.textures.exists("glow-window")) {
      this.cabinGlow = this.scene.add.image(this.sprite.x, this.sprite.y + CABIN_OY, "glow-window");
      this.cabinGlow.setDisplaySize(5, 4);
      this.cabinGlow.setScrollFactor(LAYER);
      this.cabinGlow.setDepth(DEPTH + 1);
      this.cabinGlow.setBlendMode(Phaser.BlendModes.ADD);
      this.cabinGlow.setLighting(false);
      this.cabinGlow.setVisible(false);
    }
    this.cabinLight = this.scene.lights.addLight(this.sprite.x, this.sprite.y + CABIN_OY, 22, 0xffc070, 0);
  }

  update(dt: number, mood: WeatherMood, isDark: boolean): void {
    this.place();
    if (!this.sprite) {
      return;
    }
    if (mood === "fog" && !this.force) {
      this.sprite.setVisible(false);
      this.syncNight(false);
      return;
    }

    if (this.force) {
      this.forceElapsed += dt;
      const cycle = FORCE_CROSSING_SEC * 2;
      const t = this.forceElapsed % cycle;
      const outbound = t < FORCE_CROSSING_SEC;
      const progress = outbound ? t / FORCE_CROSSING_SEC : (t - FORCE_CROSSING_SEC) / FORCE_CROSSING_SEC;
      this.sprite.setVisible(true);
      this.layout(outbound ? "bristol" : "prudence", progress, isDark);
      return;
    }

    const crossing = activeCrossing();
    if (!crossing) {
      this.sprite.setVisible(false);
      this.syncNight(false);
      return;
    }
    this.sprite.setVisible(true);
    this.layout(crossing.from, crossing.progress, isDark);
  }

  private layout(from: Terminal, progress: number, isDark: boolean): void {
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
    this.syncNight(isDark && this.sprite.visible);
  }

  private syncNight(on: boolean): void {
    const hull = this.sprite;
    const cabinX = hull ? hull.x : 0;
    const cabinY = KEEL_Y + CABIN_OY;
    if (this.cabinGlow) {
      this.cabinGlow.setPosition(cabinX, cabinY);
      this.cabinGlow.setVisible(on);
    }
    if (this.cabinLight) {
      const cam = this.scene.cameras.main;
      this.cabinLight.x = cabinX + cam.scrollX * (1 - LAYER);
      this.cabinLight.y = cabinY + cam.scrollY * (1 - LAYER);
      this.cabinLight.setIntensity(on ? 0.7 : 0);
      this.cabinLight.setVisible(on);
    }
  }
}
