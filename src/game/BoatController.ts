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
  BOAT_PASSENGER_SCALE,
  BOAT_SEAT_X,
  BOAT_SEAT_Y,
  PLACES,
  VIEW_HEIGHT,
  WAKE_SPEED,
  boatFacingRight,
  boatSternOffsetX,
} from "./layout";
import type { NightLights } from "./NightLights";

export class BoatController {
  sprite?: Phaser.GameObjects.Image;
  vx = 0;
  vy = 0;

  private scene: Phaser.Scene;
  private night: NightLights;
  private wake?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, night: NightLights) {
    this.scene = scene;
    this.night = night;
  }

  place(): void {
    if (!this.sprite && this.scene.textures.exists("boat")) {
      this.sprite = this.scene.add.image(PLACES.boat.x, PLACES.boat.y, "boat");
      this.sprite.setName("boat");
      this.sprite.setOrigin(0.5, 1);
      this.sprite.setScrollFactor(SCROLL.actors);
      this.sprite.setDepth(BOAT_DEPTH);
      this.sprite.setLighting(true);
      this.sprite.setFlipX(false);
    }
    this.ensureWake();
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
    this.sprite.x = Math.round(this.sprite.x);
    this.sprite.y = Math.round(this.sprite.y);
    if (nearDock && wish.y === 0 && Math.abs(this.vy) < 10) {
      this.sprite.y += (BOAT_DOCK_Y - this.sprite.y) * Math.min(1, 3 * dt);
    }
    this.face(wish.x);
    this.night.syncBoatNav(this.sprite, true);
  }

  updateDepth(): void {
    if (this.sprite) {
      this.sprite.setDepth(BOAT_DEPTH);
    }
    if (this.wake && this.sprite) {
      this.wake.setDepth(BOAT_DEPTH - 1);
    }
  }

  updateWake(possession: Possession, dt: number): void {
    this.ensureWake();
    if (!this.wake || !this.sprite) {
      return;
    }
    const speed = Math.hypot(this.vx, this.vy);
    const moving = possession === "boat" && speed > WAKE_SPEED;
    this.wake.setVisible(moving);
    if (!moving) {
      return;
    }
    const facingRight = boatFacingRight(this.sprite);
    const behind = facingRight ? -1 : 1;
    const trail = Math.max(36, Math.round(this.wake.displayWidth * 0.42));
    const bob = Math.round(Math.sin(this.scene.time.now / 140) * 2);
    const sternX = this.sprite.x + boatSternOffsetX(facingRight) + behind * (trail + bob);
    const wakeH = Math.round(this.wake.displayHeight);
    const wakeY = Math.min(VIEW_HEIGHT - wakeH - 1, this.sprite.y - 16);
    this.wake.setPosition(Math.round(sternX), Math.round(wakeY));
    this.wake.setFlipX(facingRight);
    this.wake.setAlpha(0.88 + 0.1 * Math.sin(this.scene.time.now / 160 + dt * 3));
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
    this.sprite.setFlipX(false);
    if (this.scene.textures.exists("boat")) {
      this.sprite.setTexture("boat");
    }
    if (this.wake) {
      this.wake.setVisible(false);
    }
    this.night.setBoatNavVisible(true, this.sprite);
    this.night.syncBoatNav(this.sprite, true);
    return true;
  }

  dismount(): void {
    this.vx = 0;
    this.vy = 0;
    if (this.sprite) {
      this.sprite.setPosition(PLACES.boat.x, BOAT_DOCK_Y);
      this.sprite.setFlipX(false);
      if (this.scene.textures.exists("boat")) {
        this.sprite.setTexture("boat");
      }
    }
    if (this.wake) {
      this.wake.setVisible(false);
    }
    this.night.setBoatNavVisible(false);
  }

  passengerSeat(): { x: number; y: number; flipX: boolean; scale: number } | null {
    if (!this.sprite) {
      return null;
    }
    const facingRight = boatFacingRight(this.sprite);
    const seatX = facingRight ? BOAT_SEAT_X : -BOAT_SEAT_X;
    return {
      x: Math.round(this.sprite.x + seatX),
      y: Math.round(this.sprite.y + BOAT_SEAT_Y),
      // Player art faces right; boat flipX means hull faces right.
      flipX: !facingRight,
      scale: BOAT_PASSENGER_SCALE,
    };
  }

  /** Art faces left; flipX means the hull faces right — match helm / velocity. */
  private face(wishX: number): void {
    if (!this.sprite) {
      return;
    }
    if (wishX !== 0) {
      this.sprite.setFlipX(wishX > 0);
      return;
    }
    if (Math.abs(this.vx) > 6) {
      this.sprite.setFlipX(this.vx > 0);
    }
  }

  private ensureWake(): void {
    if (this.wake || !this.scene.textures.exists("wake")) {
      return;
    }
    this.wake = this.scene.add.image(PLACES.boat.x, PLACES.boat.y - 6, "wake");
    this.wake.setName("boat-wake");
    this.wake.setOrigin(0.5, 0);
    this.wake.setScrollFactor(SCROLL.actors);
    this.wake.setDepth(BOAT_DEPTH - 1);
    this.wake.setLighting(false);
    this.wake.setScale(0.7);
    this.wake.setVisible(false);
  }
}
