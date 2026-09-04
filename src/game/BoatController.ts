import Phaser from "phaser";
import type { Possession } from "./interact";
import { SCROLL } from "./layers";
import {
  BOAT_DEPTH,
  BOAT_DOCK_MAX_X,
  BOAT_DOCK_Y,
  BOAT_OPEN_MAX_Y,
  BOAT_OPEN_MIN_X,
  BOAT_OPEN_MIN_Y,
  BOAT_STERN_X,
  PLACES,
} from "./layout";
import type { NightLights } from "./NightLights";

export class BoatController {
  sprite?: Phaser.GameObjects.Image;
  vx = 0;
  vy = 0;

  private scene: Phaser.Scene;
  private night: NightLights;
  private wake?: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene, night: NightLights) {
    this.scene = scene;
    this.night = night;
  }

  place(): void {
    if (this.sprite || !this.scene.textures.exists("boat")) {
      return;
    }
    this.sprite = this.scene.add.image(PLACES.boat.x, PLACES.boat.y, "boat");
    this.sprite.setName("boat");
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScrollFactor(SCROLL.actors);
    this.sprite.setDepth(BOAT_DEPTH);
    this.sprite.setLighting(true);
    this.sprite.setFlipX(true);

    if (this.scene.textures.exists("wake") && !this.wake) {
      this.wake = this.scene.add.tileSprite(PLACES.boat.x - 70, PLACES.boat.y - 4, 96, 16, "wake");
      this.wake.setOrigin(0.5, 1);
      this.wake.setScrollFactor(SCROLL.actors);
      this.wake.setDepth(BOAT_DEPTH - 1);
      this.wake.setVisible(false);
      this.wake.setLighting(true);
    }
  }

  steer(dt: number, wish: { x: number; y: number }): void {
    if (!this.sprite) {
      return;
    }
    this.vx += (wish.x * 96 - this.vx) * Math.min(1, 1.6 * dt);
    this.vy += (wish.y * 56 - this.vy) * Math.min(1, 1.6 * dt);
    this.sprite.x = Phaser.Math.Clamp(
      this.sprite.x + this.vx * dt,
      BOAT_OPEN_MIN_X,
      BOAT_DOCK_MAX_X,
    );
    const nearDock = this.sprite.x > BOAT_DOCK_MAX_X - 36;
    const yTargetMax = nearDock ? BOAT_DOCK_Y : BOAT_OPEN_MAX_Y;
    const yMin = nearDock ? BOAT_DOCK_Y - 12 : BOAT_OPEN_MIN_Y;
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y + this.vy * dt, yMin, yTargetMax);
    if (nearDock && wish.y === 0 && Math.abs(this.vy) < 10) {
      this.sprite.y += (BOAT_DOCK_Y - this.sprite.y) * Math.min(1, 3 * dt);
    }
    if (Math.abs(this.vx) > 8) {
      this.sprite.setFlipX(this.vx < 0);
    }
    const moving = Math.abs(this.vx) > 12 || Math.abs(this.vy) > 12;
    if (moving && this.scene.textures.exists("boat-underway")) {
      this.sprite.setTexture("boat-underway");
    } else if (this.scene.textures.exists("boat")) {
      this.sprite.setTexture("boat");
    }
  }

  updateDepth(): void {
    if (this.sprite) {
      this.sprite.setDepth(BOAT_DEPTH);
    }
    if (this.wake && this.sprite) {
      this.wake.setDepth(BOAT_DEPTH - 1);
    }
  }

  updateWake(possession: Possession): void {
    if (!this.wake || !this.sprite) {
      return;
    }
    const moving = possession === "boat" && Math.abs(this.vx) > 14;
    this.wake.setVisible(moving);
    if (!moving) {
      return;
    }
    const facingRight = !this.sprite.flipX;
    const stern = facingRight ? -BOAT_STERN_X : BOAT_STERN_X;
    this.wake.setPosition(this.sprite.x + stern, this.sprite.y - 4);
    this.wake.setFlipX(!facingRight);
    this.wake.tilePositionX += facingRight ? 40 * 0.016 : -40 * 0.016;
  }

  syncNav(boarded: boolean): void {
    this.night.syncBoatNav(this.sprite, boarded);
  }

  board(): boolean {
    if (!this.sprite) {
      return false;
    }
    this.vx = 0;
    this.vy = 0;
    this.sprite.setPosition(PLACES.boat.x, BOAT_DOCK_Y);
    this.night.setBoatNavVisible(true, this.sprite);
    this.night.syncBoatNav(this.sprite, true);
    return true;
  }

  dismount(): void {
    this.vx = 0;
    this.vy = 0;
    if (this.sprite) {
      this.sprite.setPosition(PLACES.boat.x, BOAT_DOCK_Y);
      if (this.scene.textures.exists("boat")) {
        this.sprite.setTexture("boat");
      }
    }
    if (this.wake) {
      this.wake.setVisible(false);
    }
    this.night.setBoatNavVisible(false);
  }

  passengerSeat(): { x: number; y: number } | null {
    if (!this.sprite) {
      return null;
    }
    return { x: this.sprite.x, y: this.sprite.y - 8 };
  }
}
