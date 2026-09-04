import Phaser from "phaser";
import { SCROLL } from "./layers";
import {
  DOCK_DEPTH,
  FLAGPOLE_DEPTH,
  HORIZON_Y,
  LAND_TOP_Y,
  PLACES,
  WALKER_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./layout";
import { TEX } from "./textures";
import { tideShoreY, tideSurfaceY, tideWaterTop } from "./tide";
import type { WeatherMood } from "./weather";
import {
  FLAGPOLE_PLACE,
  FLAG_KEYS,
  flagPose,
  flagTextureKey,
  type WindSample,
} from "./flag";
import { SUN_SCALE, skyState, type SkyBodyState } from "./skyBodies";

/** Land, water, buildings, dock, traps, and sky props. */
export class HarborWorld {
  water?: Phaser.GameObjects.TileSprite;
  waterDeep?: Phaser.GameObjects.TileSprite;
  foam?: Phaser.GameObjects.TileSprite;
  shoreFoam?: Phaser.GameObjects.TileSprite;
  shoreWash?: Phaser.GameObjects.TileSprite;
  wavesLayer?: Phaser.GameObjects.TileSprite;
  lighthouse?: Phaser.GameObjects.Image;
  farCottages: Phaser.GameObjects.Image[] = [];
  farShore?: Phaser.GameObjects.TileSprite;
  fogVeil?: Phaser.GameObjects.Rectangle;
  rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  clouds: Phaser.GameObjects.Image[] = [];
  waterPhase = 0;
  surfaceY = tideSurfaceY(0.5);
  skyIsDark = false;

  private scene: Phaser.Scene;
  private placed = new Set<string>();
  private waveFrame = 0;
  private waveFrameAcc = 0;
  private skySun?: Phaser.GameObjects.Image;
  private skyMoon?: Phaser.GameObjects.Image;
  private skyStars: Phaser.GameObjects.Image[] = [];
  private deepFill?: Phaser.GameObjects.Rectangle;
  private landFill?: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Rectangle;
  private flagpole?: Phaser.GameObjects.Image;
  private flag?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  buildBase(): void {
    const sky = this.scene.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH * 2,
      WORLD_HEIGHT * 3,
      0x5b93c5,
    );
    sky.setScrollFactor(SCROLL.sky);
    sky.setDepth(-100);
    sky.setName("sky");

    const deepKey = this.scene.textures.exists("water-deep") ? "water-deep" : "water";
    this.waterDeep = this.scene.add.tileSprite(
      WORLD_WIDTH / 2,
      0,
      WORLD_WIDTH + 128,
      56,
      deepKey,
    );
    this.waterDeep.setScrollFactor(SCROLL.water);
    this.waterDeep.setDepth(18);
    this.waterDeep.setLighting(true);

    this.deepFill = this.scene.add.rectangle(WORLD_WIDTH / 2, 0, WORLD_WIDTH, 4, 0x16344f);
    this.deepFill.setScrollFactor(SCROLL.water);
    this.deepFill.setDepth(17);

    if (this.scene.textures.exists("waves-0")) {
      this.wavesLayer = this.scene.add.tileSprite(
        WORLD_WIDTH / 2,
        0,
        WORLD_WIDTH + 128,
        16,
        "waves-0",
      );
      this.wavesLayer.setScrollFactor(SCROLL.water);
      this.wavesLayer.setDepth(19);
      this.wavesLayer.setLighting(true);
    }

    const surfaceKey = this.scene.textures.exists("water") ? "water" : deepKey;
    this.water = this.scene.add.tileSprite(
      WORLD_WIDTH / 2,
      0,
      WORLD_WIDTH + 128,
      32,
      surfaceKey,
    );
    this.water.setScrollFactor(SCROLL.water);
    this.water.setDepth(20);
    this.water.setLighting(true);
    this.water.setAlpha(this.scene.textures.exists("water-deep") ? 0.55 : 1);

    if (this.scene.textures.exists("waves-foam")) {
      const foamH = Math.max(12, this.scene.textures.get("waves-foam").get().height);
      this.foam = this.scene.add.tileSprite(
        WORLD_WIDTH / 2,
        0,
        WORLD_WIDTH + 128,
        foamH,
        "waves-foam",
      );
      this.foam.setScrollFactor(SCROLL.water);
      this.foam.setDepth(21);
      this.foam.setLighting(true);

      this.shoreFoam = this.scene.add.tileSprite(
        WORLD_WIDTH / 2,
        0,
        WORLD_WIDTH + 128,
        foamH,
        "waves-foam",
      );
      this.shoreFoam.setScrollFactor(SCROLL.land);
      this.shoreFoam.setDepth(37);
      this.shoreFoam.setLighting(true);

      this.shoreWash = this.scene.add.tileSprite(
        WORLD_WIDTH / 2,
        0,
        WORLD_WIDTH + 128,
        8,
        this.scene.textures.exists("water-deep") ? "water-deep" : "waves-foam",
      );
      this.shoreWash.setScrollFactor(SCROLL.land);
      this.shoreWash.setDepth(36);
      this.shoreWash.setLighting(true);
      this.shoreWash.setVisible(false);
    }

    if (this.scene.textures.exists("road-stone")) {
      this.landFill = this.scene.add.tileSprite(
        WORLD_WIDTH / 2,
        0,
        WORLD_WIDTH,
        8,
        "road-stone",
      );
      this.landFill.setScrollFactor(SCROLL.land);
      this.landFill.setDepth(30);
      this.landFill.setLighting(true);
    } else {
      this.landFill = this.scene.add.rectangle(WORLD_WIDTH / 2, 0, WORLD_WIDTH, 8, 0x5f7034);
      this.landFill.setScrollFactor(SCROLL.land);
      this.landFill.setDepth(30);
    }

    this.applyTide(0.5);

    if (this.scene.textures.exists("wharf-planks")) {
      const stripH = 28;
      const strip = this.scene.add.tileSprite(
        WORLD_WIDTH / 2,
        WALKER_Y - 6,
        WORLD_WIDTH,
        stripH,
        "wharf-planks",
      );
      strip.setScrollFactor(SCROLL.land);
      strip.setDepth(32);
      strip.setLighting(true);
    } else {
      const dirt = this.scene.add.rectangle(WORLD_WIDTH / 2, LAND_TOP_Y + 4, WORLD_WIDTH, 10, 0x6b542e);
      dirt.setScrollFactor(SCROLL.land);
      dirt.setDepth(31);
    }

    this.fogVeil = this.scene.add.rectangle(0, 0, 800, 400, 0xb8bec4, 0.4);
    this.fogVeil.setOrigin(0, 0);
    this.fogVeil.setScrollFactor(0);
    this.fogVeil.setDepth(460);
    this.fogVeil.setVisible(false);

    this.rain = this.scene.add.particles(0, 0, TEX.rain, {
      x: { min: 0, max: 640 },
      y: -10,
      lifespan: 1000,
      speedY: { min: 170, max: 250 },
      speedX: { min: -28, max: -8 },
      quantity: 3,
      frequency: 18,
      emitting: false,
    });
    this.rain.setScrollFactor(0);
    this.rain.setDepth(500);
  }

  placeReadyProps(): void {
    const farH = this.scene.textures.exists("far-shore")
      ? this.scene.textures.get("far-shore").get().height
      : 10;
    this.farShore = this.tileIfNeeded(
      "far-shore",
      "far-shore",
      WORLD_WIDTH / 2,
      HORIZON_Y,
      WORLD_WIDTH * 2,
      farH,
      SCROLL.farShore,
      8,
    );

    this.placeFarCottages();
    this.onceImage("lighthouse", "lighthouse", PLACES.lighthouse.x, PLACES.lighthouse.y, {
      scrollFactor: SCROLL.farShore,
      depth: 12,
    });
    this.lighthouse = this.scene.children.getByName("lighthouse") as
      | Phaser.GameObjects.Image
      | undefined;

    this.placeBuilding("coffee-shop", "coffee-shop", PLACES.coffee.x, PLACES.coffee.y, {
      depth: PLACES.coffee.y - 8,
      underpaint: true,
    });
    this.placeBuilding("shack-a", "shack-a", PLACES.shackA.x, PLACES.shackA.y, {
      depth: PLACES.shackA.y - 8,
      underpaint: true,
    });
    this.placeBuilding("shack-b", "shack-b", PLACES.shackB.x, PLACES.shackB.y, {
      depth: PLACES.shackB.y - 8,
      underpaint: true,
    });
    this.onceImage("sign-github", "sign-github", PLACES.signGithub.x, PLACES.signGithub.y, {
      depth: PLACES.signGithub.y,
      lighting: false,
    });
    this.onceImage("sign-x", "sign-x", PLACES.signX.x, PLACES.signX.y, {
      depth: PLACES.signX.y,
      lighting: false,
    });
    this.onceImage("kayak", "kayak", PLACES.kayak.x, PLACES.kayak.y, { depth: PLACES.kayak.y });
    this.onceImage("paddle", "paddle", PLACES.paddle.x, PLACES.paddle.y, {
      depth: PLACES.paddle.y,
    });

    this.placeSeawall();
    this.placeDock();
    this.placeTraps();
    this.placeFenders();
    this.placeFlag();
    this.placeClouds();
    this.placeSkyDressing();
  }

  updateSkyBodies(now: Date, viewW: number, mood: WeatherMood): SkyBodyState {
    this.placeSkyDressing();
    const sky = skyState(now, viewW, mood);
    this.skyIsDark = sky.isDark;

    if (this.skySun) {
      this.skySun.setPosition(sky.sunPose.x, sky.sunPose.y);
      this.skySun.setVisible(sky.sunPose.visible);
      this.skySun.setAlpha(sky.sunPose.alpha);
    }
    if (this.skyMoon) {
      this.skyMoon.setPosition(sky.moonPose.x, sky.moonPose.y);
      this.skyMoon.setVisible(sky.moonPose.visible);
      this.skyMoon.setAlpha(sky.moonPose.alpha);
    }
    for (const star of this.skyStars) {
      star.setVisible(sky.starsVisible);
    }

    const skyRect = this.scene.children.getByName("sky") as Phaser.GameObjects.Rectangle | null;
    if (skyRect) {
      skyRect.setFillStyle(sky.skyColor, 1);
    }
    return sky;
  }

  twinkleSky(_dt: number, dark: boolean, now: number): void {
    if (!dark || this.skyStars.length === 0) {
      return;
    }
    const t = now / 1000;
    this.skyStars.forEach((star, i) => {
      if (!star.visible) {
        return;
      }
      star.setAlpha(0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.17) + i)));
    });
  }

  applyTide(level: number): void {
    const surfaceY = tideSurfaceY(level);
    const shoreY = tideShoreY(level);
    const waterTop = tideWaterTop(surfaceY);
    const waterBot = Math.max(shoreY, LAND_TOP_Y);
    this.surfaceY = surfaceY;

    const deepH = Math.max(56, waterBot - waterTop);
    if (this.waterDeep) {
      this.waterDeep.setSize(WORLD_WIDTH + 128, deepH);
      this.waterDeep.setPosition(WORLD_WIDTH / 2, Math.round(waterTop + deepH / 2));
    }
    if (this.deepFill) {
      const fillH = waterBot - waterTop + 4;
      this.deepFill.setSize(WORLD_WIDTH, fillH);
      this.deepFill.setPosition(WORLD_WIDTH / 2, Math.round(waterTop + fillH / 2));
    }
    if (this.wavesLayer) {
      this.wavesLayer.setPosition(WORLD_WIDTH / 2, surfaceY + 10);
    }
    if (this.water) {
      this.water.setPosition(WORLD_WIDTH / 2, surfaceY + 14);
    }
    if (this.foam) {
      this.foam.setPosition(WORLD_WIDTH / 2, surfaceY + 4);
    }
    if (this.shoreFoam) {
      this.shoreFoam.setPosition(WORLD_WIDTH / 2, shoreY);
    }
    if (this.shoreWash) {
      const washH = Math.max(0, shoreY - LAND_TOP_Y);
      this.shoreWash.setVisible(washH > 0);
      if (washH > 0) {
        const h = Math.max(8, washH + 2);
        this.shoreWash.setSize(WORLD_WIDTH + 128, h);
        this.shoreWash.setPosition(WORLD_WIDTH / 2, Math.round(LAND_TOP_Y + washH / 2));
      }
    }
    if (this.landFill) {
      const landTop = Math.min(LAND_TOP_Y, shoreY);
      const landH = WORLD_HEIGHT - landTop + 8;
      const landY = Math.round((landTop + WORLD_HEIGHT) / 2);
      this.landFill.setSize(WORLD_WIDTH, landH);
      this.landFill.setPosition(WORLD_WIDTH / 2, landY);
    }
  }

  scrollWater(dt: number): void {
    this.waterPhase += dt;
    const t = this.waterPhase;
    const deepX = Math.sin(t * 0.7) * 1.5 + Math.sin(t * 1.9) * 0.6;
    const deepY = Math.sin(t * 1.1) * 0.8;
    const surfX = Math.sin(t * 1.3 + 0.8) * 2.2 + Math.sin(t * 2.4) * 0.7;
    const surfY = Math.sin(t * 1.6 + 0.4) * 1.1;
    const foamX = Math.sin(t * 1.8 + 1.2) * 2.8;
    const foamY = Math.sin(t * 2.1) * 0.6;

    if (this.waterDeep) {
      this.waterDeep.tilePositionX = deepX;
      this.waterDeep.tilePositionY = deepY;
    }
    if (this.water) {
      this.water.tilePositionX = surfX;
      this.water.tilePositionY = surfY;
      this.water.setAlpha(
        this.scene.textures.exists("water-deep")
          ? 0.45 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.2))
          : 0.88 + 0.08 * Math.sin(t * 2.0),
      );
    }
    if (this.wavesLayer) {
      this.wavesLayer.tilePositionX = Math.sin(t * 1.5 + 0.3) * 2.0;
      this.wavesLayer.tilePositionY = Math.sin(t * 1.7) * 0.9;
      this.wavesLayer.setAlpha(0.55 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.4)));
      this.waveFrameAcc += dt;
      if (this.waveFrameAcc >= 0.28) {
        this.waveFrameAcc = 0;
        const keys = ["waves-0", "waves-1", "waves-2"].filter((k) => this.scene.textures.exists(k));
        if (keys.length > 1) {
          this.waveFrame = (this.waveFrame + 1) % keys.length;
          this.wavesLayer.setTexture(keys[this.waveFrame]!);
        }
      }
    }
    if (this.foam) {
      this.foam.tilePositionX = foamX;
      this.foam.tilePositionY = foamY;
      this.foam.setAlpha(0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.9 + 0.6)));
    }
    if (this.shoreFoam) {
      this.shoreFoam.tilePositionX = Math.sin(t * 1.6 + 2.1) * 2.4;
      this.shoreFoam.tilePositionY = Math.sin(t * 1.9 + 0.4) * 0.5;
      this.shoreFoam.setAlpha(0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.7 + 1.1)));
    }
    if (this.shoreWash) {
      this.shoreWash.tilePositionX = Math.sin(t * 0.9 + 0.4) * 1.2;
      this.shoreWash.setAlpha(0.72 + 0.1 * Math.sin(t * 1.5));
    }
  }

  driftClouds(dt: number): void {
    for (const cloud of this.clouds) {
      cloud.x += 6 * dt;
      if (cloud.x > WORLD_WIDTH + 80) {
        cloud.x = -80;
      }
    }
  }

  layoutRain(visW: number, visH: number): void {
    if (!this.rain) {
      return;
    }
    this.rain.setConfig({ x: { min: 0, max: visW } });
    if (this.fogVeil) {
      this.fogVeil.setSize(visW + 8, visH + 8);
    }
  }

  applyWeather(mood: WeatherMood): void {
    if (this.fogVeil) {
      this.fogVeil.setVisible(mood === "fog");
    }
    if (this.farShore) {
      this.farShore.setVisible(mood !== "fog");
    }
    if (this.lighthouse) {
      this.lighthouse.setVisible(mood !== "fog");
    }
    for (const cottage of this.farCottages) {
      cottage.setVisible(mood !== "fog");
    }
    if (this.rain) {
      if (mood === "rain") {
        this.rain.start();
      } else {
        this.rain.stop();
      }
    }
    this.placeSkyDressing();
  }

  private placeBuilding(
    id: string,
    key: string,
    x: number,
    y: number,
    opts: { depth: number; underpaint?: boolean },
  ): void {
    if (opts.underpaint && this.scene.textures.exists(key) && !this.placed.has(`${id}-under`)) {
      const frame = this.scene.textures.get(key).get();
      const uw = Math.max(24, Math.round(frame.width * 0.82));
      const uh = Math.max(24, Math.round(frame.height * 0.72));
      const under = this.scene.add.rectangle(
        x,
        y - Math.round(frame.height * 0.42),
        uw,
        uh,
        0x1a1814,
      );
      under.setName(`${id}-under`);
      under.setOrigin(0.5, 0.5);
      under.setScrollFactor(SCROLL.land);
      under.setDepth(opts.depth - 1);
      this.placed.add(`${id}-under`);
    }
    this.onceImage(id, key, x, y, { depth: opts.depth });
  }

  private placeFarCottages(): void {
    const spots = [
      { id: "far-cottage-a", key: "far-cottage-a", x: PLACES.farCottageA.x, y: PLACES.farCottageA.y },
      { id: "far-cottage-b", key: "far-cottage-b", x: PLACES.farCottageB.x, y: PLACES.farCottageB.y },
    ];
    for (const spot of spots) {
      const img = this.onceImage(spot.id, spot.key, spot.x, spot.y, {
        scrollFactor: SCROLL.farShore,
        depth: 10,
      });
      if (img && !this.farCottages.includes(img)) {
        this.farCottages.push(img);
      }
    }
  }

  private placeSeawall(): void {
    if (!this.scene.textures.exists("seawall")) {
      return;
    }
    const frame = this.scene.textures.get("seawall").get();
    const tileW = frame.width;
    const startX = Math.max(tileW / 2, PLACES.dock.x + 70);
    let i = 0;
    for (let x = startX; x < WORLD_WIDTH + tileW; x += Math.max(1, tileW - 1)) {
      this.onceImage(`seawall-${i}`, "seawall", x, LAND_TOP_Y + 8, { depth: 34 });
      i += 1;
    }
    this.onceImage("seawall-stairs", "seawall-stairs", PLACES.coffee.x - 20, LAND_TOP_Y + 8, {
      depth: 35,
    });
  }

  private placeDock(): void {
    if (this.scene.textures.exists("dock")) {
      this.onceImage("dock", "dock", PLACES.dock.x, PLACES.dock.y, {
        depth: DOCK_DEPTH,
      });
    } else if (this.scene.textures.exists("wharf-planks")) {
      const deck = this.scene.add.tileSprite(
        PLACES.dock.x,
        PLACES.dock.y - 12,
        120,
        16,
        "wharf-planks",
      );
      deck.setName("dock-planks");
      deck.setOrigin(0.5, 1);
      deck.setScrollFactor(SCROLL.land);
      deck.setDepth(DOCK_DEPTH);
      deck.setLighting(true);
      this.placed.add("dock-planks");
    }
  }

  private placeFenders(): void {
    if (!this.scene.textures.exists("fender")) {
      return;
    }
    const spots = [
      { id: "fender-0", x: PLACES.dock.x - 32, y: PLACES.dock.y - 2 },
      { id: "fender-1", x: PLACES.dock.x - 6, y: PLACES.dock.y },
      { id: "fender-2", x: PLACES.dock.x + 22, y: PLACES.dock.y - 2 },
    ];
    for (const spot of spots) {
      this.onceImage(spot.id, "fender", spot.x, spot.y, {
        depth: DOCK_DEPTH + 2,
      });
    }
  }

  private placeTraps(): void {
    this.onceImage("trap-0", "trap", 198, LAND_TOP_Y + 6, { depth: LAND_TOP_Y + 6 });
    this.onceImage("trap-stack", "trap-stack", 214, LAND_TOP_Y + 8, { depth: LAND_TOP_Y + 8 });
    this.onceImage("trap-buoy", "trap-buoy", 760, LAND_TOP_Y + 4, { depth: LAND_TOP_Y + 4 });
    this.onceImage("trap-1", "trap", 900, LAND_TOP_Y + 6, { depth: LAND_TOP_Y + 6 });
  }

  private placeFlag(): void {
    if (!this.flagpole && this.scene.textures.exists("flagpole")) {
      this.flagpole = this.onceImage(
        "flagpole",
        "flagpole",
        FLAGPOLE_PLACE.x,
        FLAGPOLE_PLACE.y,
        { depth: FLAGPOLE_DEPTH },
      );
    }
    const flagKey = FLAG_KEYS.find((key) => this.scene.textures.exists(key));
    if (!this.flag && flagKey) {
      this.flag = this.scene.add.image(FLAGPOLE_PLACE.x, FLAGPOLE_PLACE.y, flagKey);
      this.flag.setName("harbor-flag");
      this.flag.setOrigin(0, 0);
      this.flag.setScrollFactor(SCROLL.land);
      this.flag.setDepth(FLAGPOLE_DEPTH + 1);
      this.flag.setLighting(true);
      this.placed.add("harbor-flag");
    }
  }

  updateFlag(wind: WindSample): void {
    if (!this.flagpole) {
      this.placeFlag();
    }
    if (!this.flag || !this.flagpole) {
      return;
    }
    const pose = flagPose(wind, this.waterPhase);
    const key = flagTextureKey(pose);
    if (this.scene.textures.exists(key) && this.flag.texture.key !== key) {
      this.flag.setTexture(key);
    }
    this.flag.setFlipX(pose.flipX);
    this.flag.setOrigin(pose.flipX ? 1 : 0, 0);
    this.flag.setAngle(0);
    const poleH = this.flagpole.displayHeight || this.flagpole.height;
    const hoistX = this.flagpole.x + (pose.flipX ? -2 : 2);
    const hoistY = this.flagpole.y - poleH + 10;
    this.flag.setPosition(hoistX, hoistY);
    this.flag.setDepth(FLAGPOLE_DEPTH + 1);
  }

  private placeClouds(): void {
    if (!this.scene.textures.exists("cloud") || this.clouds.length > 0) {
      return;
    }
    const spots = [
      { x: 80, y: 28 },
      { x: 260, y: 44 },
      { x: 520, y: 22 },
      { x: 880, y: 36 },
    ];
    for (const spot of spots) {
      const cloud = this.scene.add.image(spot.x, spot.y, "cloud");
      cloud.setScrollFactor(SCROLL.sky);
      cloud.setDepth(-20);
      this.clouds.push(cloud);
    }
  }

  private placeSkyDressing(): void {
    if (!this.skySun && this.scene.textures.exists("sun")) {
      this.skySun = this.scene.add.image(72, 28, "sun");
      this.skySun.setScrollFactor(SCROLL.sky);
      this.skySun.setDepth(-40);
      this.skySun.setLighting(false);
      this.skySun.setOrigin(0.5, 0.5);
      this.skySun.setScale(SUN_SCALE);
    }
    if (!this.skyMoon && this.scene.textures.exists("moon")) {
      this.skyMoon = this.scene.add.image(118, 24, "moon");
      this.skyMoon.setScrollFactor(SCROLL.sky);
      this.skyMoon.setDepth(-39);
      this.skyMoon.setLighting(false);
      this.skyMoon.setOrigin(0.5, 0.5);
      this.skyMoon.setVisible(false);
    }
    if (this.skyStars.length === 0 && this.scene.textures.exists("star")) {
      const spots = [
        { x: 36, y: 14 },
        { x: 88, y: 22 },
        { x: 140, y: 12 },
        { x: 190, y: 28 },
        { x: 248, y: 16 },
        { x: 310, y: 20 },
        { x: 360, y: 11 },
        { x: 420, y: 26 },
        { x: 480, y: 15 },
        { x: 540, y: 22 },
      ];
      for (const spot of spots) {
        const star = this.scene.add.image(spot.x, spot.y, "star");
        star.setScrollFactor(SCROLL.sky);
        star.setDepth(-41);
        star.setLighting(false);
        star.setOrigin(0.5, 0.5);
        star.setVisible(false);
        this.skyStars.push(star);
      }
    }
  }

  private tileIfNeeded(
    id: string,
    key: string,
    x: number,
    y: number,
    width: number,
    height: number,
    scrollFactor: number,
    depth: number,
  ): Phaser.GameObjects.TileSprite | undefined {
    if (this.placed.has(id) || !this.scene.textures.exists(key)) {
      return this.scene.children.getByName(id) as Phaser.GameObjects.TileSprite | undefined;
    }
    const sprite = this.scene.add.tileSprite(x, y, width, height, key);
    sprite.setName(id);
    sprite.setOrigin(0.5, 1);
    sprite.setScrollFactor(scrollFactor);
    sprite.setDepth(depth);
    sprite.setLighting(true);
    this.placed.add(id);
    return sprite;
  }

  private onceImage(
    id: string,
    key: string,
    x: number,
    y: number,
    opts: {
      scrollFactor?: number;
      depth?: number;
      flipX?: boolean;
      lighting?: boolean;
    } = {},
  ): Phaser.GameObjects.Image | undefined {
    if (this.placed.has(id) || !this.scene.textures.exists(key)) {
      return this.scene.children.getByName(id) as Phaser.GameObjects.Image | undefined;
    }
    const img = this.scene.add.image(x, y, key);
    img.setName(id);
    img.setOrigin(0.5, 1);
    img.setScrollFactor(opts.scrollFactor ?? SCROLL.land);
    img.setDepth(opts.depth ?? y);
    img.setLighting(opts.lighting ?? true);
    if (opts.flipX) {
      img.setFlipX(true);
    }
    this.placed.add(id);
    return img;
  }
}
