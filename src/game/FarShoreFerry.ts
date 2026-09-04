import Phaser from "phaser";
import { activeCrossing, bowFacesRight, ferryForced, type Terminal } from "./ferrySchedule";
import { DEPTH, SCROLL } from "./layers";
import { setPixelHome } from "./camera";
import { WATER_SURFACE_Y, WORLD_MID_X, WORLD_WIDTH } from "./layout";
import type { WeatherMood } from "./weather";

/** One-way `?ferry=1` crossing. Real Bristol↔Prudence runs are 30 minutes. */
export const FORCE_CROSSING_SEC = 90;
const LAYER = SCROLL.farShore;
const CABIN_OY = -11;
const HULL_TINT = 0xfffcf0;

/** Distant Prudence Island ferry on the far-shore water lane. */
export class FarShoreFerry {
  private scene: Phaser.Scene;
  private sprite?: Phaser.GameObjects.Image;
  private cabinGlow?: Phaser.GameObjects.Image;
  private cabinLight?: Phaser.GameObjects.Light;
  private force: boolean;
  private forceElapsed = 0;
  private keelY = WATER_SURFACE_Y + 4;

  constructor(scene: Phaser.Scene, search = window.location.search) {
    this.scene = scene;
    this.force = ferryForced(search);
  }

  place(): void {
    if (this.sprite || !this.scene.textures.exists("prudence-ferry")) {
      return;
    }
    this.sprite = this.scene.add.image(WORLD_MID_X, this.keelY, "prudence-ferry");
    this.sprite.setName("prudence-ferry");
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScrollFactor(LAYER);
    this.sprite.setDepth(DEPTH.ferry);
    this.sprite.setLighting(false);
    this.sprite.setTint(HULL_TINT);
    this.sprite.setVisible(false);

    if (this.scene.textures.exists("glow-window")) {
      this.cabinGlow = this.scene.add.image(this.sprite.x, this.sprite.y + CABIN_OY, "glow-window");
      this.cabinGlow.setDisplaySize(8, 5);
      this.cabinGlow.setScrollFactor(LAYER);
      this.cabinGlow.setDepth(DEPTH.ferry + 1);
      this.cabinGlow.setBlendMode(Phaser.BlendModes.ADD);
      this.cabinGlow.setLighting(false);
      this.cabinGlow.setVisible(false);
    }
    this.cabinLight = this.scene.lights.addLight(
      this.sprite.x,
      this.sprite.y + CABIN_OY,
      28,
      0xffc070,
      0,
    );
  }

  update(dt: number, mood: WeatherMood, isDark: boolean, surfaceY = WATER_SURFACE_Y): void {
    this.keelY = Math.round(surfaceY + 4);
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
      const progress = outbound
        ? t / FORCE_CROSSING_SEC
        : (t - FORCE_CROSSING_SEC) / FORCE_CROSSING_SEC;
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
    const x0 = 48;
    const x1 = WORLD_WIDTH - 48;
    const worldX = right ? x0 + (x1 - x0) * p : x1 - (x1 - x0) * p;
    this.sprite.setPosition(Math.round(worldX), this.keelY);
    this.sprite.setFlipX(!right);
    this.sprite.setDepth(DEPTH.ferry);
    this.sprite.setLighting(false);
    this.sprite.setScrollFactor(LAYER);
    setPixelHome(this.sprite);
    this.syncNight(isDark && this.sprite.visible);
  }

  private syncNight(on: boolean): void {
    const hull = this.sprite;
    const cabinX = hull ? hull.x : 0;
    const cabinY = this.keelY + CABIN_OY;
    if (this.cabinGlow) {
      this.cabinGlow.setPosition(cabinX, cabinY);
      this.cabinGlow.setScrollFactor(LAYER);
      setPixelHome(this.cabinGlow);
      this.cabinGlow.setVisible(on);
    }
    if (this.cabinLight) {
      const cam = this.scene.cameras.main;
      this.cabinLight.x = Math.round(cabinX + cam.scrollX * (1 - LAYER));
      this.cabinLight.y = Math.round(cabinY + cam.scrollY * (1 - LAYER));
      this.cabinLight.setIntensity(on ? 1.7 : 0);
      this.cabinLight.setVisible(on);
    }
  }
}
