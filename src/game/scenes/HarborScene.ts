import Phaser from "phaser";
import { STREAM_IMAGES, artUrl } from "../assets";
import { AmbientCritters } from "../AmbientCritters";
import { BoatController } from "../BoatController";
import { FarShoreFerry } from "../FarShoreFerry";
import { HarborWorld } from "../buildWorld";
import {
  applyHarborCamera,
  bindPixelSnap,
  harborViewSize,
  snapHarborCamera,
  syncHarborFollowOffset,
} from "../camera";
import { EventBus } from "../EventBus";
import { NightLights } from "../NightLights";
import { SCROLL } from "../layers";
import { STICK_DEADZONE, shouldShowVirtualStick } from "../touchControls";
import {
  openInteractUrl,
  type InteractId,
  type Possession,
} from "../interact";
import {
  BOAT_DEPTH,
  BOAT_DOCK_Y,
  PLACES,
  SPAWN,
  WALKER_MIN_X,
  WALKER_Y,
  WORLD_WIDTH,
} from "../layout";
import { loadTideLevel, tideShoreY, tideSurfaceY } from "../tide";
import { DEFAULT_WIND, type WindSample } from "../flag";
import { DAY_AMBIENT, colorToCss, hudUsesCream } from "../skyBodies";
import {
  harborNow,
  loadAtmosphere,
  type WeatherMood,
} from "../weather";
import {
  POSTCARD_FORCE_DELAY_MS,
  POSTCARD_WALK_S,
  postcardForced,
  shouldOfferPostcard,
} from "../postcard";

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

export class HarborScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private world!: HarborWorld;
  private boat!: BoatController;
  private night!: NightLights;
  private critters!: AmbientCritters;
  private ferry!: FarShoreFerry;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Keys;
  private possession: Possession = "walker";
  private walkTarget: { x: number; y: number } | null = null;
  private stickX = 0;
  private touchStick = false;
  private mood: WeatherMood = "clearDay";
  private tideLevel = 0.5;
  private tideTarget = 0.5;
  private appliedTideKey = "";
  private activeZone: InteractId | null = null;
  private usingUntil = 0;
  private entering = false;
  private walkSeconds = 0;
  private postcardOffered = false;
  private postcardOpen = false;
  private postcardForceReady = false;
  private onStreamFile?: () => void;
  private onStreamComplete?: () => void;
  private wind: WindSample = DEFAULT_WIND;
  private skyIsDark = false;
  private lastSkyCss = "";

  constructor() {
    super({ key: "Harbor" });
  }

  create(): void {
    this.cameras.main.roundPixels = true;
    this.lights.enable();
    this.lights.setAmbientColor(DAY_AMBIENT);

    this.world = new HarborWorld(this);
    this.night = new NightLights(this);
    this.boat = new BoatController(this, this.night);
    this.critters = new AmbientCritters(this);
    this.ferry = new FarShoreFerry(this, window.location.search);

    this.makeAnims();
    this.world.buildBase();
    this.night.createBeam();
    this.world.layoutRain(harborViewSize(this).width, harborViewSize(this).height);
    this.buildPlayer();
    this.placeReadyProps();
    this.streamRest();
    this.bindInput();
    applyHarborCamera(this, this.player);
    bindPixelSnap(this);
    this.scale.on("resize", this.onResize, this);

    void loadAtmosphere(window.location.search).then((atmo) => {
      if (!this.sys.isActive()) {
        return;
      }
      this.wind = {
        speedKmh: atmo.windSpeedKmh,
        directionDeg: atmo.windDirDeg,
      };
      this.applyMood(atmo.mood);
    });
    void loadTideLevel(window.location.search).then((level) => {
      if (!this.sys.isActive()) {
        return;
      }
      this.tideTarget = level;
    });

    this.time.addEvent({
      delay: 16000,
      loop: true,
      callback: () => this.critters.spawnShark(),
    });

    this.touchStick = shouldShowVirtualStick();
    EventBus.on("harbor-interact", this.onHudInteract);
    EventBus.on("harbor-stick", this.onStick);
    EventBus.on("harbor-postcard", this.onPostcard);
    EventBus.emit("current-scene-ready", this);
    this.events.once("shutdown", () => {
      EventBus.off("harbor-interact", this.onHudInteract);
      EventBus.off("harbor-stick", this.onStick);
      EventBus.off("harbor-postcard", this.onPostcard);
      this.scale.off("resize", this.onResize, this);
      this.clearStreamListeners();
    });

    if (postcardForced(window.location.search)) {
      this.time.delayedCall(POSTCARD_FORCE_DELAY_MS, () => {
        this.postcardForceReady = true;
        this.maybeOfferPostcard();
      });
    }

    const search = window.location.search;
    if (
      playtestFlag(search, "berth") ||
      playtestFlag(search, "boat") ||
      playtestFlag(search, "underway")
    ) {
      this.player.setPosition(PLACES.dock.x + 20, WALKER_Y);
      applyHarborCamera(this, this.player);
    }
    if (playtestFlag(search, "underway")) {
      this.time.delayedCall(140, () => {
        this.board();
        const hull = this.boat.sprite;
        if (hull) {
          hull.setPosition(PLACES.boat.x - 140, BOAT_DOCK_Y);
          hull.setFlipX(false);
          this.boat.vx = -80;
          applyHarborCamera(this, hull);
        }
      });
    } else if (playtestFlag(search, "boat")) {
      this.time.delayedCall(120, () => {
        this.board();
      });
    }
  }

  private onResize = (): void => {
    if (!this.sys.isActive()) {
      return;
    }
    const follow =
      this.possession === "boat" && this.boat.sprite ? this.boat.sprite : this.player;
    applyHarborCamera(this, follow);
    const view = harborViewSize(this);
    this.world.layoutRain(view.width, view.height);
  };

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.world.scrollWater(dt);
    this.easeTide(dt);
    this.world.driftClouds(dt);
    this.steer(dt);
    this.maybeOfferPostcard();
    this.player.setDepth(this.player.y);
    if (this.possession === "boat") {
      this.player.setDepth(BOAT_DEPTH + 2);
    }
    if (this.boat.sprite) {
      this.boat.sprite.x = Math.round(this.boat.sprite.x);
      this.boat.sprite.y = Math.round(this.boat.sprite.y);
    }
    this.player.x = Math.round(this.player.x);
    this.player.y = Math.round(this.player.y);
    this.boat.updateDepth();
    this.boat.updateWake(this.possession, dt);
    this.boat.syncNav(this.possession === "boat");
    this.critters.update(dt);
    const sky = this.syncSky();
    this.world.updateFlag(this.wind);
    this.ferry.update(dt, this.mood, sky.isDark, this.world.surfaceY);
    this.night.updateBeam(dt, sky.isDark);
    this.night.updateFarShore(sky.isDark);
    this.night.updatePlayerLantern(
      this.player,
      sky.isDark,
      this.possession,
      this.entering,
      this.time.now,
    );
    this.world.twinkleSky(dt, sky.isDark, this.time.now);
    this.refreshPrompt();
    const follow =
      this.possession === "boat" && this.boat.sprite ? this.boat.sprite : this.player;
    syncHarborFollowOffset(this, follow);
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

  private buildPlayer(): void {
    this.player = this.add.sprite(SPAWN.x, WALKER_Y, this.idleTextureKey());
    this.player.setOrigin(0.5, 1);
    this.player.setScrollFactor(SCROLL.actors);
    this.player.setDepth(WALKER_Y);
    this.player.setLighting(true);
    this.player.play("player-idle");
    this.night.buildPlayerLantern(this.player);
  }

  private streamRest(): void {
    let queued = 0;
    for (const key of STREAM_IMAGES) {
      if (!this.textures.exists(key)) {
        this.load.image(key, artUrl(key));
        queued += 1;
      }
    }
    if (queued === 0) {
      this.placeReadyProps();
      return;
    }
    this.onStreamFile = (): void => {
      this.placeReadyProps();
    };
    this.onStreamComplete = (): void => {
      this.clearStreamListeners();
      this.placeReadyProps();
    };
    this.load.once("complete", this.onStreamComplete);
    this.load.on("filecomplete", this.onStreamFile);
    this.load.start();
  }

  private clearStreamListeners(): void {
    if (this.onStreamFile) {
      this.load.off("filecomplete", this.onStreamFile);
      this.onStreamFile = undefined;
    }
    if (this.onStreamComplete) {
      this.load.off("complete", this.onStreamComplete);
      this.onStreamComplete = undefined;
    }
  }

  private placeReadyProps(): void {
    this.world.placeReadyProps();
    this.night.setLighthouse(this.world.lighthouse);
    this.ferry.place();
    this.boat.place();
    this.night.ensureDecor(this.skyIsDark);
    this.syncSky();
    this.critters.ensure(this.mood);
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
      if (this.postcardOpen || this.touchStick) {
        return;
      }
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.walkTarget = {
        x: Phaser.Math.Clamp(world.x, WALKER_MIN_X, WORLD_WIDTH - 24),
        y: WALKER_Y,
      };
    });

    focusHost();
  }

  private onHudInteract = (): void => {
    if (this.sys.isPaused() || this.postcardOpen) {
      return;
    }
    this.tryInteract();
  };

  private onStick = (...args: unknown[]): void => {
    const payload = args[0] as { x?: number } | undefined;
    const x = typeof payload?.x === "number" ? payload.x : 0;
    this.stickX = Math.abs(x) < STICK_DEADZONE ? 0 : Phaser.Math.Clamp(x, -1, 1);
    if (this.stickX !== 0) {
      this.walkTarget = null;
    }
  };

  private onPostcard = (...args: unknown[]): void => {
    this.postcardOpen = args[0] === true;
  };

  private wish(dt: number): { x: number; y: number; keyed: boolean } {
    void dt;
    let x = 0;
    let y = 0;
    const leftDown = Boolean(this.cursors?.left?.isDown || this.wasd?.left?.isDown);
    const rightDown = Boolean(this.cursors?.right?.isDown || this.wasd?.right?.isDown);
    const upDown = Boolean(this.cursors?.up?.isDown || this.wasd?.up?.isDown);
    const downDown = Boolean(this.cursors?.down?.isDown || this.wasd?.down?.isDown);
    if (leftDown) {
      x -= 1;
    }
    if (rightDown) {
      x += 1;
    }
    if (this.possession === "boat") {
      if (upDown) {
        y -= 1;
      }
      if (downDown) {
        y += 1;
      }
    }
    if (x === 0 && this.stickX !== 0) {
      x = this.stickX;
    }
    const keyed = x !== 0 || y !== 0;
    if (keyed) {
      this.walkTarget = null;
    } else if (this.walkTarget) {
      const body = this.possession === "boat" && this.boat.sprite ? this.boat.sprite : this.player;
      x = this.walkTarget.x - body.x;
      if (Math.abs(x) < 4) {
        this.walkTarget = null;
        x = 0;
      }
    }
    if (x !== 0) {
      x = Math.abs(x) >= 1 ? Math.sign(x) : x;
    }
    return { x, y, keyed };
  }

  private steer(dt: number): void {
    const wish = this.wish(dt);
    this.noteWalk(wish, dt);
    if (this.possession === "boat" && this.boat.sprite) {
      this.boat.steer(dt, wish);
      const seat = this.boat.passengerSeat();
      if (seat) {
        this.player.setVisible(true);
        this.player.setScale(seat.scale);
        this.player.setPosition(seat.x, seat.y);
        this.player.setFlipX(seat.flipX);
        this.player.setDepth(BOAT_DEPTH + 2);
        this.player.play("player-idle", true);
      }
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
      WALKER_MIN_X,
      WORLD_WIDTH - 24,
    );
    this.player.y = WALKER_Y;
    if (wish.x !== 0) {
      this.player.setFlipX(wish.x < 0);
    }
    if (wish.x !== 0) {
      this.player.play("player-walk", true);
    } else {
      this.player.play("player-idle", true);
    }
  }

  private zones(): Zone[] {
    return [
      { id: "cafe", x: PLACES.coffee.x + 28, y: WALKER_Y, w: 56, h: 48, mode: "walker" },
      { id: "board", x: PLACES.dock.x + 12, y: WALKER_Y, w: 88, h: 48, mode: "walker" },
      { id: "dismount", x: PLACES.boat.x, y: BOAT_DOCK_Y, w: 90, h: 64, mode: "boat" },
      { id: "github", x: PLACES.signGithub.x, y: WALKER_Y, w: 40, h: 48, mode: "walker" },
      { id: "x", x: PLACES.signX.x, y: WALKER_Y, w: 40, h: 48, mode: "walker" },
      { id: "zoning", x: PLACES.shackA.x - 8, y: WALKER_Y, w: 56, h: 48, mode: "walker" },
      { id: "potager", x: PLACES.shackB.x - 8, y: WALKER_Y, w: 56, h: 48, mode: "walker" },
      { id: "weatherOtter", x: PLACES.kayak.x, y: WALKER_Y, w: 56, h: 48, mode: "walker" },
    ];
  }

  private noteWalk(wish: { x: number; y: number }, dt: number): void {
    if (this.time.now < this.usingUntil) {
      return;
    }
    const moving =
      this.possession === "boat" ? wish.x !== 0 || wish.y !== 0 : wish.x !== 0;
    if (!moving) {
      return;
    }
    this.walkSeconds += dt;
  }

  private maybeOfferPostcard(): void {
    if (this.postcardOffered || this.entering) {
      return;
    }
    if (this.scene.isActive("Interior")) {
      return;
    }
    const search = window.location.search;
    if (!shouldOfferPostcard(search)) {
      return;
    }
    if (postcardForced(search)) {
      if (!this.postcardForceReady) {
        return;
      }
    } else if (this.walkSeconds < POSTCARD_WALK_S) {
      return;
    }
    this.postcardOffered = true;
    EventBus.emit("harbor-postcard-request");
  }

  private overlappingZone(): InteractId | null {
    const body = this.possession === "boat" && this.boat.sprite ? this.boat.sprite : this.player;
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
    if (this.postcardOpen) {
      return;
    }
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
      case "weatherOtter":
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
    if (!this.boat.board()) {
      return;
    }
    this.possession = "boat";
    this.player.setVisible(true);
    const seat = this.boat.passengerSeat();
    if (seat) {
      this.player.setScale(seat.scale);
      this.player.setPosition(seat.x, seat.y);
      this.player.setFlipX(seat.flipX);
      this.player.setDepth(BOAT_DEPTH + 2);
      this.player.play("player-idle", true);
    }
    this.walkTarget = null;
    applyHarborCamera(this, this.boat.sprite);
  }

  private dismount(): void {
    this.possession = "walker";
    this.player.setVisible(true);
    this.player.setScale(1);
    this.player.setPosition(PLACES.dock.x + 20, WALKER_Y);
    this.player.setDepth(WALKER_Y);
    this.boat.dismount();
    applyHarborCamera(this, this.player);
  }

  private easeTide(dt: number): void {
    this.tideLevel += (this.tideTarget - this.tideLevel) * Math.min(1, 1.8 * dt);
    if (Math.abs(this.tideTarget - this.tideLevel) < 0.002) {
      this.tideLevel = this.tideTarget;
    }
    const surfaceY = tideSurfaceY(this.tideLevel);
    const shoreY = tideShoreY(this.tideLevel);
    const key = `${surfaceY}:${shoreY}`;
    if (key === this.appliedTideKey) {
      return;
    }
    this.appliedTideKey = key;
    this.world.applyTide(this.tideLevel);
    this.critters.setSurfaceY(surfaceY);
  }

  private syncSky(): ReturnType<HarborWorld["updateSkyBodies"]> {
    const { width } = harborViewSize(this);
    const sky = this.world.updateSkyBodies(
      harborNow(window.location.search),
      width,
      this.mood,
    );
    if (this.skyIsDark !== sky.isDark) {
      this.skyIsDark = sky.isDark;
      this.night.setDecorVisible(sky.isDark);
    }
    const css = colorToCss(sky.skyColor);
    if (css !== this.lastSkyCss) {
      this.lastSkyCss = css;
      this.cameras.main.setBackgroundColor(sky.skyColor);
      this.lights.setAmbientColor(sky.ambientColor);
      EventBus.emit("harbor-weather", this.mood, {
        skyCss: css,
        isDark: sky.isDark,
        hudCream: hudUsesCream(sky.skyColor, sky.isDark, this.mood),
      });
    }
    return sky;
  }

  private applyMood(mood: WeatherMood): void {
    this.mood = mood;
    this.lastSkyCss = "";
    const sky = this.syncSky();
    this.skyIsDark = sky.isDark;
    this.world.applyWeather(mood);
    this.night.ensureDecor(sky.isDark);
    this.night.setDecorVisible(sky.isDark);
    this.night.updatePlayerLantern(
      this.player,
      sky.isDark,
      this.possession,
      this.entering,
      this.time.now,
    );
    EventBus.emit("harbor-weather", mood, {
      skyCss: colorToCss(sky.skyColor),
      isDark: sky.isDark,
      hudCream: hudUsesCream(sky.skyColor, sky.isDark, mood),
    });
    this.critters.ensure(mood);
  }
}

function playtestFlag(search: string, key: string): boolean {
  return new URLSearchParams(search).get(key) === "1";
}
