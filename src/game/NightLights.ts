import Phaser from "phaser";
import type { Possession } from "./interact";
import { SCROLL } from "./layers";
import {
  BOAT_BOW_Y,
  BOAT_STERN_Y,
  PLACES,
  boatBowOffsetX,
  boatFacingRight,
  boatSternOffsetX,
} from "./layout";

/**
 * Window/street lamps, hand lantern, lighthouse beam, boat bow/stern lights.
 * Boat nav is Phaser Light2D only — no overlay sprite.
 */
export class NightLights {
  private scene: Phaser.Scene;
  private beam?: Phaser.GameObjects.Light;
  private beamAngle = 0;
  private lighthouse?: Phaser.GameObjects.Image;
  private nightLights: Phaser.GameObjects.Light[] = [];
  private nightGlows: Phaser.GameObjects.Image[] = [];
  private boatNavLights: Phaser.GameObjects.Light[] = [];
  private farLights: { light: Phaser.GameObjects.Light; x: number; y: number }[] = [];
  private playerLantern?: Phaser.GameObjects.Image;
  private playerLanternGlow?: Phaser.GameObjects.Image;
  private playerLanternLight?: Phaser.GameObjects.Light;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createBeam(): void {
    this.beam = this.scene.lights.addConeLight(
      PLACES.lighthouse.x - 13,
      PLACES.lighthouse.y - 72,
      280,
      0xffcc88,
      0,
      0,
      Phaser.Math.DegToRad(28),
      Phaser.Math.DegToRad(64),
    );
  }

  setLighthouse(lighthouse?: Phaser.GameObjects.Image): void {
    this.lighthouse = lighthouse;
  }

  ensureDecor(dark: boolean): void {
    if (this.nightLights.length > 0) {
      this.setDecorVisible(dark);
      return;
    }

    const fixtures: {
      x: number;
      y: number;
      windowOx: number;
      windowOy: number;
      windowW: number;
      windowH: number;
      lampOx: number;
    }[] = [
      {
        x: PLACES.coffee.x,
        y: PLACES.coffee.y,
        windowOx: -22,
        windowOy: -30,
        windowW: 36,
        windowH: 18,
        lampOx: 8,
      },
      {
        x: PLACES.shackA.x,
        y: PLACES.shackA.y,
        windowOx: 13,
        windowOy: -34,
        windowW: 14,
        windowH: 12,
        lampOx: 6,
      },
      {
        x: PLACES.shackB.x,
        y: PLACES.shackB.y,
        windowOx: 10,
        windowOy: -33,
        windowW: 12,
        windowH: 12,
        lampOx: 4,
      },
    ];

    for (const fix of fixtures) {
      const warm = this.scene.lights.addLight(fix.x + 4, fix.y - 36, 110, 0xffb060, 0);
      this.nightLights.push(warm);

      const street = this.scene.lights.addLight(fix.x + fix.lampOx, fix.y + 10, 70, 0xffe2a8, 0);
      this.nightLights.push(street);

      if (this.scene.textures.exists("glow-window")) {
        const glow = this.scene.add.image(fix.x + fix.windowOx, fix.y + fix.windowOy, "glow-window");
        glow.setDisplaySize(fix.windowW, fix.windowH);
        glow.setScrollFactor(SCROLL.land);
        glow.setDepth(fix.y - 7);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.setLighting(false);
        glow.setVisible(false);
        this.nightGlows.push(glow);
      }
      if (this.scene.textures.exists("glow-street")) {
        const lamp = this.scene.add.image(fix.x + fix.lampOx, fix.y + 2, "glow-street");
        lamp.setOrigin(0.5, 1);
        lamp.setScrollFactor(SCROLL.land);
        lamp.setDepth(fix.y + 2);
        lamp.setBlendMode(Phaser.BlendModes.ADD);
        lamp.setLighting(false);
        lamp.setVisible(false);
        this.nightGlows.push(lamp);
      }
    }

    this.nightLights.push(
      this.scene.lights.addLight(PLACES.signGithub.x, PLACES.signGithub.y - 12, 48, 0xfff2d0, 0),
    );
    this.nightLights.push(
      this.scene.lights.addLight(PLACES.signX.x, PLACES.signX.y - 12, 48, 0xfff2d0, 0),
    );

    this.placeFarCottageNight();
    this.setDecorVisible(dark);
  }

  private placeFarCottageNight(): void {
    if (this.farLights.length > 0) {
      return;
    }
    const windows = [
      { x: PLACES.farCottageA.x - 1, y: PLACES.farCottageA.y - 8, w: 3, h: 3 },
      { x: PLACES.farCottageB.x + 1, y: PLACES.farCottageB.y - 7, w: 3, h: 3 },
    ];
    for (const win of windows) {
      const light = this.scene.lights.addLight(win.x, win.y, 28, 0xffb060, 0);
      this.farLights.push({ light, x: win.x, y: win.y });
      if (this.scene.textures.exists("glow-window")) {
        const glow = this.scene.add.image(win.x, win.y, "glow-window");
        glow.setDisplaySize(win.w, win.h);
        glow.setScrollFactor(SCROLL.farShore);
        glow.setDepth(11);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.setLighting(false);
        glow.setVisible(false);
        this.nightGlows.push(glow);
      }
    }
  }

  updateFarShore(dark: boolean): void {
    const on = dark;
    const cam = this.scene.cameras.main;
    const sf = SCROLL.farShore;
    for (const far of this.farLights) {
      far.light.x = far.x + cam.scrollX * (1 - sf);
      far.light.y = far.y + cam.scrollY * (1 - sf);
      far.light.setIntensity(on ? 0.55 : 0);
      far.light.setVisible(on);
    }
  }

  setDecorVisible(on: boolean): void {
    for (const light of this.nightLights) {
      light.setIntensity(on ? 1.4 : 0);
      light.setVisible(on);
    }
    for (let i = 0; i < this.nightLights.length; i += 1) {
      if (i % 2 === 1 && i < 6) {
        this.nightLights[i]?.setIntensity(on ? 0.85 : 0);
      }
    }
    for (const glow of this.nightGlows) {
      glow.setVisible(on);
    }
  }

  buildPlayerLantern(player: Phaser.GameObjects.Sprite): void {
    if (!this.scene.textures.exists("lantern") || this.playerLantern) {
      return;
    }
    this.playerLantern = this.scene.add.image(player.x, player.y, "lantern");
    this.playerLantern.setOrigin(0.5, 1);
    this.playerLantern.setScrollFactor(SCROLL.actors);
    this.playerLantern.setDepth(player.y + 1);
    this.playerLantern.setLighting(false);
    this.playerLantern.setVisible(false);

    if (this.scene.textures.exists("lantern-glow")) {
      this.playerLanternGlow = this.scene.add.image(player.x, player.y, "lantern-glow");
      this.playerLanternGlow.setOrigin(0.5, 0.5);
      this.playerLanternGlow.setScrollFactor(SCROLL.actors);
      this.playerLanternGlow.setDepth(player.y + 0.5);
      this.playerLanternGlow.setBlendMode(Phaser.BlendModes.ADD);
      this.playerLanternGlow.setLighting(false);
      this.playerLanternGlow.setAlpha(0.55);
      this.playerLanternGlow.setVisible(false);
    }

    this.playerLanternLight = this.scene.lights.addLight(player.x, player.y - 18, 90, 0xffc070, 0);
  }

  updatePlayerLantern(
    player: Phaser.GameObjects.Sprite,
    dark: boolean,
    possession: Possession,
    entering: boolean,
    now: number,
  ): void {
    if (!this.playerLantern) {
      this.buildPlayerLantern(player);
    }
    if (!this.playerLantern) {
      return;
    }

    const night = dark;
    const show = night && player.visible && possession === "walker" && !entering;

    const facing = player.flipX ? -1 : 1;
    const handX = player.x + facing * 10;
    let handY = player.y - 12;
    if (show && player.anims.currentAnim?.key === "player-walk") {
      handY += Math.sin(now / 90) * 1.0;
    }

    this.playerLantern.setPosition(handX, handY);
    this.playerLantern.setFlipX(player.flipX);
    this.playerLantern.setDepth(player.y + 1);
    this.playerLantern.setVisible(show);

    if (this.playerLanternGlow) {
      this.playerLanternGlow.setPosition(handX, handY - 6);
      this.playerLanternGlow.setDepth(player.y + 0.5);
      this.playerLanternGlow.setVisible(show);
      if (show) {
        this.playerLanternGlow.setAlpha(0.45 + 0.12 * Math.sin(now / 140));
      }
    }

    if (this.playerLanternLight) {
      this.playerLanternLight.x = handX;
      this.playerLanternLight.y = handY - 6;
      this.playerLanternLight.setIntensity(show ? 1.35 : 0);
      this.playerLanternLight.setVisible(show);
    }
  }

  updateBeam(dt: number, dark: boolean): void {
    if (!this.beam) {
      return;
    }
    this.beamAngle += 0.55 * dt;
    const lantern = this.lanternWorld();
    this.beam.x = lantern.x;
    this.beam.y = lantern.y;
    this.beam.setConeRotation(this.beamAngle);
    const on = dark;
    this.beam.setIntensity(on ? 2.6 : 0);
    this.beam.setVisible(on);
  }

  setBoatNavVisible(on: boolean, boat?: Phaser.GameObjects.Image): void {
    this.ensureBoatNavLights(boat);
    for (const light of this.boatNavLights) {
      light.setIntensity(on ? 1.6 : 0);
      light.setVisible(on);
    }
  }

  syncBoatNav(boat: Phaser.GameObjects.Image | undefined, boarded: boolean): void {
    if (!boat || !boarded) {
      return;
    }
    this.ensureBoatNavLights(boat);
    const facingRight = boatFacingRight(boat);
    const bowColor = facingRight ? 0x44ff88 : 0xff3355;
    const bowLight = this.boatNavLights[0];
    if (bowLight) {
      bowLight.x = boat.x + boatBowOffsetX(facingRight);
      bowLight.y = boat.y + BOAT_BOW_Y;
      bowLight.setColor(bowColor);
      bowLight.setIntensity(1.8);
      bowLight.setVisible(true);
    }
    const sternLight = this.boatNavLights[1];
    if (sternLight) {
      sternLight.x = boat.x + boatSternOffsetX(facingRight);
      sternLight.y = boat.y + BOAT_STERN_Y;
      sternLight.setColor(0xfff5e0);
      sternLight.setIntensity(1.4);
      sternLight.setVisible(true);
    }
  }

  private ensureBoatNavLights(boat?: Phaser.GameObjects.Image): void {
    if (this.boatNavLights.length > 0) {
      return;
    }
    const hull = boat;
    if (!hull) {
      return;
    }
    const facingRight = boatFacingRight(hull);
    const bowColor = facingRight ? 0x44ff88 : 0xff3355;
    this.boatNavLights.push(
      this.scene.lights.addLight(
        hull.x + boatBowOffsetX(facingRight),
        hull.y + BOAT_BOW_Y,
        42,
        bowColor,
        0,
      ),
    );
    this.boatNavLights.push(
      this.scene.lights.addLight(
        hull.x + boatSternOffsetX(facingRight),
        hull.y + BOAT_STERN_Y,
        36,
        0xfff5e0,
        0,
      ),
    );
  }

  private lanternWorld(): { x: number; y: number } {
    const sx = this.lighthouse?.x ?? PLACES.lighthouse.x;
    const sy = this.lighthouse?.y ?? PLACES.lighthouse.y;
    const sf = SCROLL.farShore;
    const cam = this.scene.cameras.main;
    return {
      x: sx - 13 + cam.scrollX * (1 - sf),
      y: sy - 72 + cam.scrollY * (1 - sf),
    };
  }
}
