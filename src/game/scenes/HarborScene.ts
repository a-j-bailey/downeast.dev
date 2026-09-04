import Phaser from "phaser";
import { STREAM_IMAGES, artUrl } from "../assets";
import { applyHarborCamera, harborViewSize, snapHarborCamera } from "../camera";
import { EventBus } from "../EventBus";
import { shouldShowVirtualStick } from "../touchControls";
import {
  openInteractUrl,
  type InteractId,
  type Possession,
} from "../interact";
import { SCROLL } from "../layers";
import {
  HORIZON_Y,
  LAND_BOTTOM_Y,
  LAND_TOP_Y,
  PLACES,
  SPAWN,
  WALKER_Y,
  WATER_BOTTOM_Y,
  WATER_SURFACE_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../layout";
import { TEX } from "../textures";
import {
  ambientColor,
  loadWeatherMood,
  skyColor,
  type WeatherMood,
} from "../weather";

type Zone = {
  id: InteractId;
  x: number;
  y: number;
  w: number;
  h: number;
  mode: Possession;
};

type Keys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
};

const WALK_Y = WALKER_Y;
const BOAT_WATER_Y = PLACES.boat.y;
/** Boat draws in front of pier midground (pier depth ~36). */
const BOAT_DEPTH = WALK_Y + 40;
/** Underway cannot pass dock toward town. */
const BOAT_DOCK_MAX_X = PLACES.boat.x;
const BOAT_OPEN_MIN_X = 60;

export class HarborScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private boat?: Phaser.GameObjects.Image;
  private wake?: Phaser.GameObjects.TileSprite;
  private water?: Phaser.GameObjects.TileSprite;
  private waterDeep?: Phaser.GameObjects.TileSprite;
  private foam?: Phaser.GameObjects.TileSprite;
  private wavesLayer?: Phaser.GameObjects.TileSprite;
  private lighthouse?: Phaser.GameObjects.Image;
  private farShore?: Phaser.GameObjects.TileSprite;
  private fogVeil?: Phaser.GameObjects.Rectangle;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private beam?: Phaser.GameObjects.Light;
  private clouds: Phaser.GameObjects.Image[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Keys;
  private possession: Possession = "walker";
  private walkTarget: { x: number; y: number } | null = null;
  private stickX = 0;
  private touchStick = false;
  private boatVx = 0;
  private beamAngle = 0;
  private mood: WeatherMood = "clearDay";
  private placed = new Set<string>();
  private activeZone: InteractId | null = null;
  private usingUntil = 0;
  private entering = false;
  private shark?: Phaser.GameObjects.Image;
  private sharkDir = 1;
  private waterPhase = 0;
  private waveFrame = 0;
  private waveFrameAcc = 0;
  private playerLantern?: Phaser.GameObjects.Image;
  private playerLanternGlow?: Phaser.GameObjects.Image;
  private playerLanternLight?: Phaser.GameObjects.Light;
  private nightLights: Phaser.GameObjects.Light[] = [];
  private nightGlows: Phaser.GameObjects.Image[] = [];
  private boatNavLights: Phaser.GameObjects.Light[] = [];
  private boatNavSprite?: Phaser.GameObjects.Image;
  private skySun?: Phaser.GameObjects.Image;
  private skyMoon?: Phaser.GameObjects.Image;
  private skyStars: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: "Harbor" });
  }

  create(): void {
    this.cameras.main.roundPixels = true;
    this.lights.enable();
    this.lights.setAmbientColor(0x8899aa);
    this.makeAnims();
    this.buildBase();
    this.buildPlayer();
    this.placeReadyProps();
    this.streamRest();
    this.bindInput();
    applyHarborCamera(this, this.player);
    this.scale.on("resize", this.onResize, this);

    void loadWeatherMood(window.location.search).then((mood) => {
      if (!this.sys.isActive()) {
        return;
      }
      this.applyMood(mood);
    });

    this.time.addEvent({
      delay: 16000,
      loop: true,
      callback: () => this.spawnShark(),
    });

    this.touchStick = shouldShowVirtualStick();
    EventBus.on("harbor-interact", this.onHudInteract);
    EventBus.on("harbor-stick", this.onStick);
    EventBus.emit("current-scene-ready", this);
    this.events.once("shutdown", () => {
      EventBus.off("harbor-interact", this.onHudInteract);
      EventBus.off("harbor-stick", this.onStick);
      this.scale.off("resize", this.onResize, this);
    });
  }

  private onResize = (): void => {
    if (!this.sys.isActive()) {
      return;
    }
    const follow = this.possession === "boat" && this.boat ? this.boat : this.player;
    applyHarborCamera(this, follow);
    this.layoutRain();
  };

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.scrollWater(dt);
    this.driftClouds(dt);
    this.steer(dt);
    this.updateDepth();
    this.updateWake();
    this.syncBoatNav();
    this.updateShark(dt);
    this.updateBeam(dt);
    this.updatePlayerLantern(dt);
    this.twinkleSky(dt);
    this.refreshPrompt();
    snapHarborCamera(this);
  }

  private idleTextureKey(): string {
    return this.textures.exists("player-idle-stand") ? "player-idle-stand" : "player-idle";
  }

  private makeAnims(): void {
    if (this.anims.exists("player-walk")) {
      this.anims.remove("player-walk");
    }
    if (this.anims.exists("player-idle")) {
      this.anims.remove("player-idle");
    }

    const hasPass = this.textures.exists("player-walk-pass");
    const walkFrames: Phaser.Types.Animations.AnimationFrame[] = hasPass
      ? [
          { key: "player-walk-0" },
          { key: "player-walk-pass" },
          { key: "player-walk-2" },
          { key: "player-walk-pass" },
        ]
      : [
          { key: "player-walk-0" },
          { key: "player-walk-1" },
          { key: "player-walk-2" },
          { key: "player-walk-3" },
        ];
    this.anims.create({
      key: "player-walk",
      frames: walkFrames,
      frameRate: hasPass ? 10 : 8,
      repeat: -1,
    });
    this.anims.create({
      key: "player-idle",
      frames: [{ key: this.idleTextureKey() }],
      frameRate: 1,
    });
    if (!this.anims.exists("player-use")) {
      this.anims.create({
        key: "player-use",
        frames: [{ key: "player-use" }],
        frameRate: 1,
      });
    }
  }

  private buildBase(): void {
    const sky = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH * 2, WORLD_HEIGHT * 3, 0x5b93c5);
    sky.setScrollFactor(SCROLL.sky);
    sky.setDepth(-100);
    sky.setName("sky");

    // Water top sits at WATER_SURFACE_Y (= HORIZON_Y) so ripples meet far-shore.
    const waterBandH = WATER_BOTTOM_Y - WATER_SURFACE_Y;
    const deepKey = this.textures.exists("water-deep") ? "water-deep" : "water";
    // Fill the full horizon→seawall band so no flat navy gap shows.
    const deepH = Math.max(waterBandH, 56);
    this.waterDeep = this.add.tileSprite(
      WORLD_WIDTH / 2,
      WATER_SURFACE_Y + deepH / 2,
      WORLD_WIDTH + 128,
      deepH,
      deepKey,
    );
    this.waterDeep.setScrollFactor(SCROLL.water);
    this.waterDeep.setDepth(18);
    this.waterDeep.setLighting(true);

    // Solid underpaint behind tiles (same span) for any thin-frame seams.
    const deepFill = this.add.rectangle(
      WORLD_WIDTH / 2,
      WATER_SURFACE_Y + waterBandH / 2,
      WORLD_WIDTH,
      waterBandH + 4,
      0x16344f,
    );
    deepFill.setScrollFactor(SCROLL.water);
    deepFill.setDepth(17);

    if (this.textures.exists("waves-0")) {
      this.wavesLayer = this.add.tileSprite(
        WORLD_WIDTH / 2,
        WATER_SURFACE_Y + 10,
        WORLD_WIDTH + 128,
        16,
        "waves-0",
      );
      this.wavesLayer.setScrollFactor(SCROLL.water);
      this.wavesLayer.setDepth(19);
      this.wavesLayer.setLighting(true);
    }

    const surfaceKey = this.textures.exists("water") ? "water" : deepKey;
    this.water = this.add.tileSprite(
      WORLD_WIDTH / 2,
      WATER_SURFACE_Y + 14,
      WORLD_WIDTH + 128,
      32,
      surfaceKey,
    );
    this.water.setScrollFactor(SCROLL.water);
    this.water.setDepth(20);
    this.water.setLighting(true);
    this.water.setAlpha(this.textures.exists("water-deep") ? 0.55 : 1);

    if (this.textures.exists("waves-foam")) {
      const foamH = Math.max(12, this.textures.get("waves-foam").get().height);
      this.foam = this.add.tileSprite(
        WORLD_WIDTH / 2,
        WATER_SURFACE_Y + 4,
        WORLD_WIDTH + 128,
        foamH,
        "waves-foam",
      );
      this.foam.setScrollFactor(SCROLL.water);
      this.foam.setDepth(21);
      this.foam.setLighting(true);
    }

    const landH = WORLD_HEIGHT - LAND_TOP_Y + 8;
    const landY = (LAND_TOP_Y + WORLD_HEIGHT) / 2;
    if (this.textures.exists("road-stone")) {
      const road = this.add.tileSprite(WORLD_WIDTH / 2, landY, WORLD_WIDTH, landH, "road-stone");
      road.setScrollFactor(SCROLL.land);
      road.setDepth(30);
      road.setLighting(true);
    } else {
      const land = this.add.rectangle(WORLD_WIDTH / 2, landY, WORLD_WIDTH, landH, 0x5f7034);
      land.setScrollFactor(SCROLL.land);
      land.setDepth(30);
    }

    if (this.textures.exists("wharf-planks")) {
      const stripH = 28;
      const strip = this.add.tileSprite(
        WORLD_WIDTH / 2,
        WALK_Y - 6,
        WORLD_WIDTH,
        stripH,
        "wharf-planks",
      );
      strip.setScrollFactor(SCROLL.land);
      strip.setDepth(32);
      strip.setLighting(true);
    } else {
      const dirt = this.add.rectangle(WORLD_WIDTH / 2, LAND_TOP_Y + 4, WORLD_WIDTH, 10, 0x6b542e);
      dirt.setScrollFactor(SCROLL.land);
      dirt.setDepth(31);
    }

    this.fogVeil = this.add.rectangle(0, 0, 800, 400, 0xb8bec4, 0.4);
    this.fogVeil.setOrigin(0, 0);
    this.fogVeil.setScrollFactor(0);
    this.fogVeil.setDepth(460);
    this.fogVeil.setVisible(false);

    this.rain = this.add.particles(0, 0, TEX.rain, {
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
    this.layoutRain();

    this.beam = this.lights.addConeLight(
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

  private buildPlayer(): void {
    this.player = this.add.sprite(SPAWN.x, WALK_Y, this.idleTextureKey());
    this.player.setOrigin(0.5, 1);
    this.player.setScrollFactor(SCROLL.actors);
    this.player.setDepth(WALK_Y);
    this.player.setLighting(true);
    this.player.play("player-idle");
    this.buildPlayerLantern();
  }

  private buildPlayerLantern(): void {
    if (!this.textures.exists("lantern") || this.playerLantern) {
      return;
    }
    this.playerLantern = this.add.image(this.player.x, this.player.y, "lantern");
    this.playerLantern.setOrigin(0.5, 1);
    this.playerLantern.setScrollFactor(SCROLL.actors);
    this.playerLantern.setDepth(this.player.y + 1);
    this.playerLantern.setLighting(false);
    this.playerLantern.setVisible(false);

    if (this.textures.exists("lantern-glow")) {
      this.playerLanternGlow = this.add.image(this.player.x, this.player.y, "lantern-glow");
      this.playerLanternGlow.setOrigin(0.5, 0.5);
      this.playerLanternGlow.setScrollFactor(SCROLL.actors);
      this.playerLanternGlow.setDepth(this.player.y + 0.5);
      this.playerLanternGlow.setBlendMode(Phaser.BlendModes.ADD);
      this.playerLanternGlow.setLighting(false);
      this.playerLanternGlow.setAlpha(0.55);
      this.playerLanternGlow.setVisible(false);
    }

    this.playerLanternLight = this.lights.addLight(
      this.player.x,
      this.player.y - 18,
      90,
      0xffc070,
      0,
    );
  }

  private updatePlayerLantern(_dt: number): void {
    if (!this.playerLantern) {
      this.buildPlayerLantern();
    }
    if (!this.playerLantern) {
      return;
    }

    const night = this.mood === "night";
    const show =
      night &&
      this.player.visible &&
      this.possession === "walker" &&
      !this.entering;

    const facing = this.player.flipX ? -1 : 1;
    // Feet origin (0.5,1): hand is ~12px up on the 43px sprite, out in front.
    const handX = this.player.x + facing * 10;
    let handY = this.player.y - 12;
    // Slight bob while walking.
    if (show && this.player.anims.currentAnim?.key === "player-walk") {
      handY += Math.sin(this.time.now / 90) * 1.0;
    }

    this.playerLantern.setPosition(handX, handY);
    this.playerLantern.setFlipX(this.player.flipX);
    this.playerLantern.setDepth(this.player.y + 1);
    this.playerLantern.setVisible(show);

    if (this.playerLanternGlow) {
      this.playerLanternGlow.setPosition(handX, handY - 6);
      this.playerLanternGlow.setDepth(this.player.y + 0.5);
      this.playerLanternGlow.setVisible(show);
      if (show) {
        this.playerLanternGlow.setAlpha(0.45 + 0.12 * Math.sin(this.time.now / 140));
      }
    }

    if (this.playerLanternLight) {
      this.playerLanternLight.x = handX;
      this.playerLanternLight.y = handY - 6;
      this.playerLanternLight.setIntensity(show ? 1.35 : 0);
      this.playerLanternLight.setVisible(show);
    }
  }

  private streamRest(): void {
    let queued = 0;
    for (const key of STREAM_IMAGES) {
      if (!this.textures.exists(key)) {
        this.load.image(key, artUrl(key));
        queued += 1;
      }
    }
    this.load.once("complete", () => this.placeReadyProps());
    this.load.on("filecomplete", () => this.placeReadyProps());
    if (queued > 0) {
      this.load.start();
    } else {
      this.placeReadyProps();
    }
  }

  private placeReadyProps(): void {
    {
      const farH = this.textures.exists("far-shore")
        ? this.textures.get("far-shore").get().height
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
    }

    this.onceImage("lighthouse", "lighthouse", PLACES.lighthouse.x, PLACES.lighthouse.y, {
      scrollFactor: SCROLL.farShore,
      depth: 12,
    });
    this.lighthouse = this.children.getByName("lighthouse") as Phaser.GameObjects.Image | undefined;

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
    this.placePiers();
    this.placeTraps();
    this.placeBoat();
    this.placeFenders();
    this.placeClouds();
    this.placeSkyDressing();
    this.ensureNightDecor();
    this.applySkyDressing();
  }

  private placeBuilding(
    id: string,
    key: string,
    x: number,
    y: number,
    opts: { depth: number; underpaint?: boolean },
  ): void {
    if (opts.underpaint && this.textures.exists(key) && !this.placed.has(`${id}-under`)) {
      const frame = this.textures.get(key).get();
      const uw = Math.max(24, Math.round(frame.width * 0.82));
      const uh = Math.max(24, Math.round(frame.height * 0.72));
      const under = this.add.rectangle(x, y - Math.round(frame.height * 0.42), uw, uh, 0x1a1814);
      under.setName(`${id}-under`);
      under.setOrigin(0.5, 0.5);
      under.setScrollFactor(SCROLL.land);
      under.setDepth(opts.depth - 1);
      // Rectangles are unlit solids (no Light2D pipeline) — intentional underpaint.
      this.placed.add(`${id}-under`);
    }
    this.onceImage(id, key, x, y, { depth: opts.depth });
  }

  private ensureNightDecor(): void {
    if (this.nightLights.length > 0) {
      this.setNightDecorVisible(this.mood === "night");
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
      // Offsets from origin (0.5, 1) using window bboxes in the processed PNGs.
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
      const warm = this.lights.addLight(fix.x + 4, fix.y - 36, 110, 0xffb060, 0);
      this.nightLights.push(warm);

      const street = this.lights.addLight(fix.x + fix.lampOx, fix.y + 10, 70, 0xffe2a8, 0);
      this.nightLights.push(street);

      if (this.textures.exists("glow-window")) {
        const glow = this.add.image(fix.x + fix.windowOx, fix.y + fix.windowOy, "glow-window");
        glow.setDisplaySize(fix.windowW, fix.windowH);
        glow.setScrollFactor(SCROLL.land);
        glow.setDepth(fix.y - 7);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.setLighting(false);
        glow.setVisible(false);
        this.nightGlows.push(glow);
      }
      if (this.textures.exists("glow-street")) {
        const lamp = this.add.image(fix.x + fix.lampOx, fix.y + 2, "glow-street");
        lamp.setOrigin(0.5, 1);
        lamp.setScrollFactor(SCROLL.land);
        lamp.setDepth(fix.y + 2);
        lamp.setBlendMode(Phaser.BlendModes.ADD);
        lamp.setLighting(false);
        lamp.setVisible(false);
        this.nightGlows.push(lamp);
      }
    }

    // Subtle sign highlights so unlit signs stay readable at night.
    this.nightLights.push(
      this.lights.addLight(PLACES.signGithub.x, PLACES.signGithub.y - 12, 48, 0xfff2d0, 0),
    );
    this.nightLights.push(
      this.lights.addLight(PLACES.signX.x, PLACES.signX.y - 12, 48, 0xfff2d0, 0),
    );

    this.setNightDecorVisible(this.mood === "night");
  }

  private setNightDecorVisible(on: boolean): void {
    for (const light of this.nightLights) {
      light.setIntensity(on ? 1.4 : 0);
      light.setVisible(on);
    }
    // Street lamps slightly softer than facade washes.
    for (let i = 0; i < this.nightLights.length; i += 1) {
      if (i % 2 === 1 && i < 6) {
        this.nightLights[i]?.setIntensity(on ? 0.85 : 0);
      }
    }
    for (const glow of this.nightGlows) {
      glow.setVisible(on);
    }
  }

  private placeSeawall(): void {
    if (!this.textures.exists("seawall")) {
      return;
    }
    const frame = this.textures.get("seawall").get();
    const tileW = frame.width;
    let i = 0;
    // Overlap 1px so stone blocks meet with no hairline gap.
    for (let x = tileW / 2; x < WORLD_WIDTH + tileW; x += Math.max(1, tileW - 1)) {
      this.onceImage(`seawall-${i}`, "seawall", x, LAND_TOP_Y + 8, { depth: 34 });
      i += 1;
    }
    this.onceImage("seawall-stairs", "seawall-stairs", PLACES.coffee.x - 20, LAND_TOP_Y + 8, {
      depth: 35,
    });
  }

  private placePiers(): void {
    this.onceImage("pier-dock", "pier", PLACES.pier.x, PLACES.pier.y, { depth: 36 });
    this.onceImage("pier-pylon", "pier", PLACES.pylon.x, PLACES.pylon.y + 6, { depth: 37 });
    this.onceImage("pier-finger", "pier", PLACES.pierFinger.x, PLACES.pierFinger.y, { depth: 36 });
    this.onceImage("pier-fg-0", "pier", 72, LAND_BOTTOM_Y - 2, {
      scrollFactor: SCROLL.foreground,
      depth: 900,
    });
    this.onceImage("pier-fg-1", "pier", 168, LAND_BOTTOM_Y, {
      scrollFactor: SCROLL.foreground,
      depth: 901,
    });
    this.onceImage("pier-fg-2", "pier", 430, LAND_BOTTOM_Y, {
      scrollFactor: SCROLL.foreground,
      depth: 902,
    });
  }


  private placeFenders(): void {
    if (!this.textures.exists("fender")) {
      return;
    }
    // Tire/rope fenders along the pier face at the berth (behind boat visually).
    const spots = [
      { id: "fender-0", x: PLACES.boat.x - 28, y: PLACES.pier.y + 10 },
      { id: "fender-1", x: PLACES.boat.x - 6, y: PLACES.pier.y + 12 },
      { id: "fender-2", x: PLACES.boat.x + 18, y: PLACES.pier.y + 10 },
    ];
    for (const spot of spots) {
      this.onceImage(spot.id, "fender", spot.x, spot.y, {
        depth: BOAT_DEPTH - 2,
      });
    }
  }

  private placeTraps(): void {
    this.onceImage("trap-0", "trap", 198, LAND_TOP_Y + 6, { depth: LAND_TOP_Y + 6 });
    this.onceImage("trap-stack", "trap-stack", 214, LAND_TOP_Y + 8, { depth: LAND_TOP_Y + 8 });
    this.onceImage("trap-buoy", "trap-buoy", 760, LAND_TOP_Y + 4, { depth: LAND_TOP_Y + 4 });
    this.onceImage("trap-1", "trap", 900, LAND_TOP_Y + 6, { depth: LAND_TOP_Y + 6 });
  }

  private placeBoat(): void {
    if (this.boat || !this.textures.exists("boat")) {
      return;
    }
    this.boat = this.onceImage("boat", "boat", PLACES.boat.x, PLACES.boat.y, {
      depth: BOAT_DEPTH,
      flipX: true,
    });
    if (this.textures.exists("wake") && !this.wake) {
      this.wake = this.add.tileSprite(PLACES.boat.x - 70, PLACES.boat.y - 4, 96, 16, "wake");
      this.wake.setOrigin(0.5, 1);
      this.wake.setScrollFactor(SCROLL.actors);
      this.wake.setDepth(BOAT_DEPTH - 1);
      this.wake.setVisible(false);
      this.wake.setLighting(true);
    }
    if (this.textures.exists("boat-nav-lights") && !this.boatNavSprite) {
      this.boatNavSprite = this.add.image(PLACES.boat.x, PLACES.boat.y, "boat-nav-lights");
      this.boatNavSprite.setOrigin(0.5, 1);
      this.boatNavSprite.setScrollFactor(SCROLL.actors);
      this.boatNavSprite.setDepth(BOAT_DEPTH + 1);
      this.boatNavSprite.setFlipX(true);
      this.boatNavSprite.setBlendMode(Phaser.BlendModes.ADD);
      this.boatNavSprite.setLighting(false);
      this.boatNavSprite.setVisible(false);
    }
  }

  private placeClouds(): void {
    if (!this.textures.exists("cloud") || this.clouds.length > 0) {
      return;
    }
    const spots = [
      { x: 80, y: 28 },
      { x: 260, y: 44 },
      { x: 520, y: 22 },
      { x: 880, y: 36 },
    ];
    for (const spot of spots) {
      const cloud = this.add.image(spot.x, spot.y, "cloud");
      cloud.setScrollFactor(SCROLL.sky);
      cloud.setDepth(-20);
      this.clouds.push(cloud);
    }
  }


  private placeSkyDressing(): void {
    if (!this.skySun && this.textures.exists("sun")) {
      // Left of center so wordmark/title stay clear.
      this.skySun = this.add.image(72, 28, "sun");
      this.skySun.setScrollFactor(SCROLL.sky);
      this.skySun.setDepth(-40);
      this.skySun.setLighting(false);
      this.skySun.setOrigin(0.5, 0.5);
    }
    if (!this.skyMoon && this.textures.exists("moon")) {
      this.skyMoon = this.add.image(118, 24, "moon");
      this.skyMoon.setScrollFactor(SCROLL.sky);
      this.skyMoon.setDepth(-39);
      this.skyMoon.setLighting(false);
      this.skyMoon.setOrigin(0.5, 0.5);
      this.skyMoon.setVisible(false);
    }
    if (this.skyStars.length === 0 && this.textures.exists("star")) {
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
        const star = this.add.image(spot.x, spot.y, "star");
        star.setScrollFactor(SCROLL.sky);
        star.setDepth(-41);
        star.setLighting(false);
        star.setOrigin(0.5, 0.5);
        star.setVisible(false);
        this.skyStars.push(star);
      }
    }
  }

  private applySkyDressing(): void {
    const night = this.mood === "night";
    const clear = this.mood === "clearDay";
    const dimDay =
      this.mood === "overcast" || this.mood === "rain" || this.mood === "fog";

    if (this.skySun) {
      this.skySun.setVisible(clear || dimDay);
      if (clear) {
        this.skySun.setAlpha(1);
      } else if (dimDay) {
        // Soft disk behind clouds.
        this.skySun.setAlpha(this.mood === "fog" ? 0.18 : 0.32);
      }
    }
    if (this.skyMoon) {
      this.skyMoon.setVisible(night);
      this.skyMoon.setAlpha(night ? 0.95 : 0);
    }
    for (const star of this.skyStars) {
      star.setVisible(night);
      if (night) {
        star.setAlpha(0.55 + Math.random() * 0.4);
      }
    }
  }

  private twinkleSky(_dt: number): void {
    if (this.mood !== "night" || this.skyStars.length === 0) {
      return;
    }
    const t = this.time.now / 1000;
    this.skyStars.forEach((star, i) => {
      star.setAlpha(0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.17) + i)));
    });
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
    if (this.placed.has(id) || !this.textures.exists(key)) {
      return this.children.getByName(id) as Phaser.GameObjects.TileSprite | undefined;
    }
    const sprite = this.add.tileSprite(x, y, width, height, key);
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
    if (this.placed.has(id) || !this.textures.exists(key)) {
      return this.children.getByName(id) as Phaser.GameObjects.Image | undefined;
    }
    const img = this.add.image(x, y, key);
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

  private bindInput(): void {
    const focusHost = (): void => {
      const host = this.game.canvas?.parentElement as HTMLElement | null;
      host?.focus({ preventScroll: true });
      this.game.canvas?.focus({ preventScroll: true });
    };

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.E,
      ]);
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        e: Phaser.Input.Keyboard.KeyCodes.E,
      }) as Keys;
      keyboard.on("keydown-E", () => this.tryInteract());
    } else {
      console.warn("[harbor] Phaser keyboard plugin unavailable; arrow/WASD disabled");
    }

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      focusHost();
      // Virtual stick owns movement on touch; keep tap-to-walk for mouse desktop.
      if (this.touchStick) {
        return;
      }
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      // Side-view: pointer walk uses X only; Y stays on the ground line.
      this.walkTarget = { x: world.x, y: WALK_Y };
    });

    focusHost();
  }

  private onHudInteract = (): void => {
    this.tryInteract();
  };

  private onStick = (...args: unknown[]): void => {
    const payload = args[0] as { x?: number } | undefined;
    const x = typeof payload?.x === "number" ? payload.x : 0;
    this.stickX = Math.abs(x) < 0.15 ? 0 : Phaser.Math.Clamp(x, -1, 1);
    if (this.stickX !== 0) {
      this.walkTarget = null;
    }
  };

  private wish(dt: number): { x: number; y: number; keyed: boolean } {
    void dt;
    let x = 0;
    // Vertical wish ignored for walker and boat (side-view lock).
    const leftDown = Boolean(this.cursors?.left?.isDown || this.wasd?.left?.isDown);
    const rightDown = Boolean(this.cursors?.right?.isDown || this.wasd?.right?.isDown);
    if (leftDown) {
      x -= 1;
    }
    if (rightDown) {
      x += 1;
    }
    if (x === 0 && this.stickX !== 0) {
      x = this.stickX;
    }
    const keyed = x !== 0;
    if (keyed) {
      this.walkTarget = null;
    } else if (this.walkTarget) {
      const body = this.possession === "boat" && this.boat ? this.boat : this.player;
      x = this.walkTarget.x - body.x;
      if (Math.abs(x) < 4) {
        this.walkTarget = null;
        x = 0;
      }
    }
    if (x !== 0) {
      // Stick can be analog; keys/tap stay unit.
      x = Math.abs(x) >= 1 ? Math.sign(x) : x;
    }
    return { x, y: 0, keyed };
  }

  private steer(dt: number): void {
    const wish = this.wish(dt);
    if (this.possession === "boat" && this.boat) {
      this.boatVx += (wish.x * 96 - this.boatVx) * Math.min(1, 1.6 * dt);
      this.boat.x = Phaser.Math.Clamp(this.boat.x + this.boatVx * dt, BOAT_OPEN_MIN_X, BOAT_DOCK_MAX_X);
      this.boat.y = BOAT_WATER_Y;
      if (Math.abs(this.boatVx) > 8) {
        // Sprite faces right by default; flip when moving left.
        this.boat.setFlipX(this.boatVx < 0);
      }
      const moving = Math.abs(this.boatVx) > 12;
      if (moving && this.textures.exists("boat-underway")) {
        this.boat.setTexture("boat-underway");
      } else if (this.textures.exists("boat")) {
        this.boat.setTexture("boat");
      }
      this.player.setPosition(this.boat.x, this.boat.y - 8);
      return;
    }

    const speed = 72;
    const using = this.time.now < this.usingUntil;
    if (using) {
      this.player.play("player-use", true);
      return;
    }
    this.player.x = Phaser.Math.Clamp(
      this.player.x + wish.x * speed * dt,
      24,
      WORLD_WIDTH - 24,
    );
    this.player.y = WALK_Y;
    if (wish.x !== 0) {
      this.player.setFlipX(wish.x < 0);
    }
    if (wish.x !== 0) {
      this.player.play("player-walk", true);
    } else {
      this.player.play("player-idle", true);
    }
  }

  private updateDepth(): void {
    this.player.setDepth(this.player.y);
    if (this.boat) {
      this.boat.setDepth(BOAT_DEPTH);
    }
    if (this.wake && this.boat) {
      this.wake.setDepth(BOAT_DEPTH - 1);
    }
    if (this.boatNavSprite && this.boat) {
      this.boatNavSprite.setDepth(BOAT_DEPTH + 1);
    }
  }

  private updateWake(): void {
    if (!this.wake || !this.boat) {
      return;
    }
    const moving = this.possession === "boat" && Math.abs(this.boatVx) > 14;
    this.wake.setVisible(moving);
    if (!moving) {
      return;
    }
    // flipX true => bow left (unflipped sprite faces right).
    const facingRight = !this.boat.flipX;
    const stern = facingRight ? -78 : 78;
    this.wake.setPosition(this.boat.x + stern, this.boat.y - 4);
    this.wake.setFlipX(!facingRight);
    this.wake.tilePositionX += facingRight ? 40 * 0.016 : -40 * 0.016;
  }

  private ensureBoatNavLights(): void {
    if (this.boatNavLights.length > 0 || !this.boat) {
      return;
    }
    // [0] bow (color by facing), [1] unused, [2] stern white — intensities toggled on board.
    this.boatNavLights.push(this.lights.addLight(this.boat.x - 20, this.boat.y - 18, 42, 0xff3355, 0));
    this.boatNavLights.push(this.lights.addLight(this.boat.x + 20, this.boat.y - 18, 42, 0x44ff88, 0));
    this.boatNavLights.push(this.lights.addLight(this.boat.x, this.boat.y - 28, 36, 0xfff5e0, 0));
  }

  private setBoatNavVisible(on: boolean): void {
    this.ensureBoatNavLights();
    for (const light of this.boatNavLights) {
      light.setIntensity(on ? 1.6 : 0);
      light.setVisible(on);
    }
    // Overlay art unused — bow/stern lights are dynamic Phaser lights only.
    if (this.boatNavSprite) {
      this.boatNavSprite.setVisible(false);
    }
  }

  private syncBoatNav(): void {
    if (!this.boat || this.possession !== "boat") {
      return;
    }
    this.ensureBoatNavLights();
    // flipX true => facing left. Colored light on the bow; white on the stern.
    const facingRight = !this.boat.flipX;
    const bow = facingRight ? 56 : -56;
    const stern = facingRight ? -56 : 56;
    const bowColor = facingRight ? 0x44ff88 : 0xff3355; // green when right, red when left
    // [0] bow color, [1] unused, [2] stern white
    if (this.boatNavLights[0]) {
      this.boatNavLights[0].x = this.boat.x + bow;
      this.boatNavLights[0].y = this.boat.y - 16;
      this.boatNavLights[0].setColor(bowColor);
      this.boatNavLights[0].setIntensity(1.8);
      this.boatNavLights[0].setVisible(true);
    }
    if (this.boatNavLights[1]) {
      this.boatNavLights[1].setIntensity(0);
      this.boatNavLights[1].setVisible(false);
    }
    if (this.boatNavLights[2]) {
      this.boatNavLights[2].x = this.boat.x + stern;
      this.boatNavLights[2].y = this.boat.y - 14;
      this.boatNavLights[2].setColor(0xfff5e0);
      this.boatNavLights[2].setIntensity(1.4);
      this.boatNavLights[2].setVisible(true);
    }
    if (this.boatNavSprite) {
      this.boatNavSprite.setVisible(false);
    }
  }

  private scrollWater(dt: number): void {
    // Ripple / shimmer instead of constant lateral flow.
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
      // Soft shimmer on the surface band.
      this.water.setAlpha(
        this.textures.exists("water-deep")
          ? 0.45 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.2))
          : 0.88 + 0.08 * Math.sin(t * 2.0),
      );
    }
    if (this.wavesLayer) {
      this.wavesLayer.tilePositionX = Math.sin(t * 1.5 + 0.3) * 2.0;
      this.wavesLayer.tilePositionY = Math.sin(t * 1.7) * 0.9;
      this.wavesLayer.setAlpha(0.55 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.4)));
      // Cycle wave crest frames when available (slow shimmer).
      this.waveFrameAcc += dt;
      if (this.waveFrameAcc >= 0.28) {
        this.waveFrameAcc = 0;
        const keys = ["waves-0", "waves-1", "waves-2"].filter((k) =>
          this.textures.exists(k),
        );
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
  }

  private driftClouds(dt: number): void {
    for (const cloud of this.clouds) {
      cloud.x += 6 * dt;
      if (cloud.x > WORLD_WIDTH + 80) {
        cloud.x = -80;
      }
    }
  }

  private spawnShark(): void {
    if (this.shark || !this.textures.exists("shark-fin")) {
      return;
    }
    this.sharkDir = Math.random() > 0.5 ? 1 : -1;
    const x = this.sharkDir > 0 ? 40 : WORLD_WIDTH - 40;
    const y = WATER_SURFACE_Y + 20 + Math.random() * 18;
    this.shark = this.add.image(x, y, "shark-fin");
    this.shark.setOrigin(0.5, 1);
    this.shark.setScrollFactor(SCROLL.actors);
    this.shark.setDepth(y);
    this.shark.setFlipX(this.sharkDir < 0);
    this.shark.setLighting(true);
  }

  private updateShark(dt: number): void {
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

  private updateBeam(dt: number): void {
    if (!this.beam) {
      return;
    }
    this.beamAngle += 0.55 * dt;
    const lantern = this.lanternWorld();
    this.beam.x = lantern.x;
    this.beam.y = lantern.y;
    this.beam.setConeRotation(this.beamAngle);
    const on = this.mood === "night";
    this.beam.setIntensity(on ? 2.6 : 0);
    this.beam.setVisible(on);
  }

  private lanternWorld(): { x: number; y: number } {
    const sx = this.lighthouse?.x ?? PLACES.lighthouse.x;
    const sy = this.lighthouse?.y ?? PLACES.lighthouse.y;
    const sf = SCROLL.farShore;
    const cam = this.cameras.main;
    return {
      x: sx - 13 + cam.scrollX * (1 - sf),
      y: sy - 72 + cam.scrollY * (1 - sf),
    };
  }

  private zones(): Zone[] {
    // Walker Y is locked to WALK_Y — zone centers must sit on that line.
    const zones: Zone[] = [
      { id: "cafe", x: PLACES.coffee.x + 28, y: WALK_Y, w: 56, h: 48, mode: "walker" },
      { id: "board", x: PLACES.boat.x + 8, y: WALK_Y, w: 80, h: 48, mode: "walker" },
      { id: "dismount", x: PLACES.pylon.x + 10, y: BOAT_WATER_Y, w: 70, h: 48, mode: "boat" },
      { id: "github", x: PLACES.signGithub.x, y: WALK_Y, w: 40, h: 48, mode: "walker" },
      { id: "x", x: PLACES.signX.x, y: WALK_Y, w: 40, h: 48, mode: "walker" },
      { id: "zoning", x: PLACES.shackA.x - 8, y: WALK_Y, w: 56, h: 48, mode: "walker" },
      { id: "potager", x: PLACES.shackB.x - 8, y: WALK_Y, w: 56, h: 48, mode: "walker" },
    ];
    return zones;
  }

  private overlappingZone(): InteractId | null {
    const body = this.possession === "boat" && this.boat ? this.boat : this.player;
    for (const zone of this.zones()) {
      if (zone.mode !== this.possession) {
        continue;
      }
      if (Math.abs(body.x - zone.x) <= zone.w / 2 && Math.abs(body.y - zone.y) <= zone.h / 2) {
        return zone.id;
      }
    }
    return null;
  }

  private refreshPrompt(): void {
    const next = this.overlappingZone();
    if (next === this.activeZone) {
      return;
    }
    this.activeZone = next;
    EventBus.emit("harbor-prompt", next);
  }

  private tryInteract(): void {
    const id = this.overlappingZone();
    if (!id) {
      return;
    }
    this.usingUntil = this.time.now + 220;
    if (this.possession === "walker") {
      this.player.play("player-use", true);
    }
    switch (id) {
      case "cafe":
        this.enterCafe();
        break;
      case "board":
        this.board();
        break;
      case "dismount":
        this.dismount();
        break;
      case "github":
      case "x":
      case "zoning":
      case "potager":
        openInteractUrl(id);
        break;
      case "leave":
        break;
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  private enterCafe(): void {
    if (this.entering) {
      return;
    }
    this.entering = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.entering = false;
      this.scene.pause();
      this.scene.launch("Interior", { id: "cafe" });
    });
  }

  private board(): void {
    if (!this.boat) {
      return;
    }
    this.possession = "boat";
    this.player.setVisible(false);
    this.walkTarget = null;
    this.boatVx = 0;
    this.boat.y = BOAT_WATER_Y;
    this.setBoatNavVisible(true);
    this.syncBoatNav();
    applyHarborCamera(this, this.boat);
  }

  private dismount(): void {
    this.possession = "walker";
    this.player.setVisible(true);
    this.player.setPosition(PLACES.pylon.x + 24, WALK_Y);
    this.boatVx = 0;
    if (this.boat) {
      this.boat.y = BOAT_WATER_Y;
      if (this.textures.exists("boat")) {
        this.boat.setTexture("boat");
      }
    }
    if (this.wake) {
      this.wake.setVisible(false);
    }
    this.setBoatNavVisible(false);
    applyHarborCamera(this, this.player);
  }

  private applyMood(mood: WeatherMood): void {
    this.mood = mood;
    const sky = skyColor(mood);
    this.cameras.main.setBackgroundColor(sky);
    const skyRect = this.children.getByName("sky") as Phaser.GameObjects.Rectangle | null;
    if (skyRect) {
      skyRect.setFillStyle(sky, 1);
    }
    this.lights.setAmbientColor(ambientColor(mood));
    if (this.fogVeil) {
      this.fogVeil.setVisible(mood === "fog");
    }
    if (this.farShore) {
      this.farShore.setVisible(mood !== "fog");
    }
    if (this.lighthouse) {
      this.lighthouse.setVisible(mood !== "fog");
    }
    if (this.rain) {
      if (mood === "rain") {
        this.rain.start();
      } else {
        this.rain.stop();
      }
    }
    this.ensureNightDecor();
    this.setNightDecorVisible(mood === "night");
    this.placeSkyDressing();
    this.applySkyDressing();
    this.updatePlayerLantern(0);
    EventBus.emit("harbor-weather", mood);
  }

  private layoutRain(): void {
    if (!this.rain) {
      return;
    }
    const { width: visW, height: visH } = harborViewSize(this);
    this.rain.setConfig({ x: { min: 0, max: visW } });
    if (this.fogVeil) {
      this.fogVeil.setSize(visW + 8, visH + 8);
    }
  }
}
