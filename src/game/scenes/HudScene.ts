import Phaser from "phaser";
import { applyHudCamera, bindPixelSnap } from "../camera";
import { EventBus } from "../EventBus";
import { HarborPostcard } from "../HarborPostcard";
import { promptText, type InteractId } from "../interact";
import { markPostcardShown, postcardForced } from "../postcard";
import { readHarborMute } from "../soundBed";
import { TEX } from "../textures";
import { STICK_DEADZONE, shouldShowVirtualStick } from "../touchControls";
import { harborNow, moodFromClock, nyClock, weatherFromQuery, type WeatherMood } from "../weather";

/** Chip height tuned for 7px bitmap glyphs + padding. */
const CHIP_H = 16;
const FONT_SIZE = 7;
const INK = 0x100f0f;
const CREAM = 0xfffcf0;

export class HudScene extends Phaser.Scene {
  private viewW = 480;
  private viewH = 270;
  private chip!: Phaser.GameObjects.NineSlice;
  private chipHit!: Phaser.GameObjects.Zone;
  private chipText!: Phaser.GameObjects.BitmapText;
  private glyph!: Phaser.GameObjects.Image;
  private clockText!: Phaser.GameObjects.BitmapText;
  private muteIcon!: Phaser.GameObjects.Image;
  private muted = false;
  private mood: WeatherMood = "clearDay";
  private isDark = false;
  private hudCream = false;
  private promptId: InteractId | null = null;
  private chromeVisible = true;
  private postcard!: HarborPostcard;
  private cameraIcon!: Phaser.GameObjects.Image;
  private cameraHit!: Phaser.GameObjects.Zone;

  private stickEnabled = false;
  private stickBase?: Phaser.GameObjects.Graphics;
  private stickKnob?: Phaser.GameObjects.Graphics;
  private stickHit?: Phaser.GameObjects.Zone;
  private stickCx = 0;
  private stickCy = 0;
  private stickRadius = 30;
  private stickPointerId: number | null = null;
  private stickX = 0;

  constructor() {
    super({ key: "Hud" });
  }

  create(): void {
    const hudCam = this.cameras.main;
    if (hudCam) {
      hudCam.transparent = true;
      hudCam.setBackgroundColor("rgba(0,0,0,0)");
      hudCam.roundPixels = true;
    }
    bindPixelSnap(this);

    const fontTex = this.textures.get("hud-font");
    if (fontTex && fontTex.key !== "__MISSING") {
      fontTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.chip = this.add.nineslice(0, 0, TEX.chip, 0, 120, CHIP_H, 2, 2, 2, 2);
    this.chip.setOrigin(0.5, 1);
    this.chip.setScrollFactor(0);
    this.chip.setDepth(20);
    this.chip.setInteractive({ useHandCursor: true });
    this.chip.on("pointerdown", () => {
      EventBus.emit("harbor-interact");
    });
    this.chipHit = this.add
      .zone(0, 0, 120, 24)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });
    this.chipHit.on("pointerdown", () => {
      EventBus.emit("harbor-interact");
    });

    this.chipText = this.add
      .bitmapText(0, 0, "hud-font", "", FONT_SIZE)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(21)
      .setTint(INK);

    const bootMood =
      weatherFromQuery(window.location.search) ?? moodFromClock(harborNow(window.location.search));
    this.mood = bootMood;
    this.isDark = bootMood === "night";
    this.hudCream = bootMood === "night" || bootMood === "rain" || bootMood === "fog";

    this.glyph = this.add.image(0, 0, glyphKey(bootMood)).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
    this.clockText = this.add
      .bitmapText(0, 0, "hud-font", nyClock(), FONT_SIZE)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setTint(this.hudCream || this.isDark ? CREAM : INK);

    this.cameraIcon = this.add
      .image(0, 0, TEX.camera)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20);
    this.cameraHit = this.add
      .zone(0, 0, 18, 16)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    this.cameraHit.on("pointerdown", this.onCamera);

    this.muted = readHarborMute();
    this.muteIcon = this.add
      .image(0, 0, this.muted ? TEX.glyphMuteOff : TEX.glyphMuteOn)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-4, -4, 20, 20),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      });
    this.muteIcon.on("pointerdown", () => {
      EventBus.emit("harbor-mute-toggle");
    });

    this.stickEnabled = shouldShowVirtualStick();
    if (this.stickEnabled) {
      this.buildStick();
    }

    this.postcard = new HarborPostcard(this, {
      onOpen: () => {
        if (!postcardForced(window.location.search)) {
          markPostcardShown();
        }
        EventBus.emit("harbor-postcard", true);
      },
      onClose: () => {
        this.setChromeVisible(true);
        EventBus.emit("harbor-postcard", false);
      },
    });

    this.layout();
    this.setPrompt(null);

    this.scale.on("resize", this.onResize, this);
    EventBus.on("harbor-prompt", this.onPrompt);
    EventBus.on("harbor-weather", this.onWeather);
    EventBus.on("harbor-postcard-request", this.onPostcardRequest);
    EventBus.on("harbor-mute-state", this.onMuteState);
    EventBus.emit("harbor-mute-query");
    this.events.once("shutdown", () => {
      EventBus.off("harbor-prompt", this.onPrompt);
      EventBus.off("harbor-weather", this.onWeather);
      EventBus.off("harbor-postcard-request", this.onPostcardRequest);
      EventBus.off("harbor-mute-state", this.onMuteState);
      this.scale.off("resize", this.onResize, this);
      this.postcard.hide();
      this.emitStick(0);
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.clockText.setText(nyClock());
        this.layout();
      },
    });
  }

  private buildStick(): void {
    const r = this.stickRadius;
    this.stickBase = this.add.graphics().setScrollFactor(0).setDepth(18).setAlpha(0.5);
    this.stickKnob = this.add.graphics().setScrollFactor(0).setDepth(19).setAlpha(0.75);
    // Wide hit zone covering chevrons + handle travel.
    this.stickHit = this.add
      .zone(0, 0, r * 2.4, 40)
      .setScrollFactor(0)
      .setDepth(18)
      .setInteractive();
    this.stickHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.stickPointerId = pointer.id;
      this.updateStickFromPointer(pointer);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.stickPointerId === null || pointer.id !== this.stickPointerId) {
        return;
      }
      this.updateStickFromPointer(pointer);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.stickPointerId === null || pointer.id !== this.stickPointerId) {
        return;
      }
      this.stickPointerId = null;
      this.stickX = 0;
      this.drawStick(0);
      this.emitStick(0);
    });
  }

  private updateStickFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.stickCx;
    const raw = Phaser.Math.Clamp(dx / this.stickRadius, -1, 1);
    const x = Math.abs(raw) < STICK_DEADZONE ? 0 : raw;
    this.stickX = x;
    this.drawStick(x);
    this.emitStick(x);
  }

  private emitStick(x: number): void {
    EventBus.emit("harbor-stick", { x });
  }

  /** Chevron + round handle: ‹  ●  › — horizontal only. */
  private drawStick(axisX: number): void {
    if (!this.stickBase || !this.stickKnob) {
      return;
    }
    const cx = this.stickCx;
    const cy = this.stickCy;
    const chevronX = Math.round(this.stickRadius * 0.78);
    const wing = Math.max(5, Math.round(this.stickRadius * 0.2));
    const knobR = Math.max(5, Math.round(this.stickRadius * 0.2));
    this.stickBase.clear();

    this.stickBase.fillStyle(0xfffcf0, 0.85);
    this.stickBase.fillTriangle(
      cx - chevronX - 5,
      cy,
      cx - chevronX + 3,
      cy - wing,
      cx - chevronX + 3,
      cy + wing,
    );
    this.stickBase.fillTriangle(
      cx + chevronX + 5,
      cy,
      cx + chevronX - 3,
      cy - wing,
      cx + chevronX - 3,
      cy + wing,
    );
    this.stickBase.lineStyle(1, 0xfffcf0, 0.35);
    this.stickBase.lineBetween(cx - chevronX + 7, cy, cx + chevronX - 7, cy);

    const knobX = cx + axisX * (this.stickRadius - 8);
    this.stickKnob.clear();
    this.stickKnob.fillStyle(0xfffcf0, 0.9);
    this.stickKnob.fillCircle(knobX, cy, knobR);
    this.stickKnob.lineStyle(1, 0x100f0f, 0.7);
    this.stickKnob.strokeCircle(knobX, cy, knobR);
  }

  private onResize = (): void => {
    if (!this.sys.isActive()) {
      return;
    }
    this.layout();
  };

  private onPostcardRequest = (): void => {
    this.openPostcard();
  };

  private onCamera = (): void => {
    this.openPostcard();
  };

  private openPostcard(): void {
    if (this.postcard.isOpen) {
      return;
    }
    this.setChromeVisible(false);
    this.postcard.show(this.viewW, this.viewH);
  }

  private setChromeVisible(show: boolean): void {
    this.chromeVisible = show;
    this.glyph.setVisible(show);
    this.clockText.setVisible(show);
    this.cameraIcon.setVisible(show);
    this.muteIcon.setVisible(show);
    if (show) {
      this.cameraHit.setInteractive({ useHandCursor: true });
      this.muteIcon.setInteractive({ useHandCursor: true });
    } else {
      this.cameraHit.disableInteractive();
      this.muteIcon.disableInteractive();
    }
    if (this.stickBase) {
      this.stickBase.setVisible(show);
    }
    if (this.stickKnob) {
      this.stickKnob.setVisible(show);
    }
    if (this.stickHit) {
      if (show) {
        this.stickHit.setInteractive();
      } else {
        this.stickHit.disableInteractive();
        this.stickPointerId = null;
        this.stickX = 0;
        this.emitStick(0);
      }
    }
    if (show) {
      this.setPrompt(this.promptId);
    } else {
      this.chip.setVisible(false);
      this.chipText.setVisible(false);
      this.chip.disableInteractive();
      this.chipHit.disableInteractive();
      this.chipHit.setVisible(false);
    }
  }

  private onPrompt = (...args: unknown[]): void => {
    const id = (args[0] ?? null) as InteractId | null;
    this.setPrompt(id);
  };

  private onWeather = (...args: unknown[]): void => {
    const mood = args[0];
    const extra = args[1] as { isDark?: boolean; hudCream?: boolean } | undefined;
    if (
      mood === "clearDay" ||
      mood === "overcast" ||
      mood === "rain" ||
      mood === "fog" ||
      mood === "night"
    ) {
      this.mood = mood;
      this.isDark = typeof extra?.isDark === "boolean" ? extra.isDark : mood === "night";
      this.hudCream =
        typeof extra?.hudCream === "boolean"
          ? extra.hudCream
          : this.isDark || mood === "rain" || mood === "fog" || mood === "night";
      this.glyph.setTexture(glyphKey(mood));
      this.layout();
    }
  };

  private onMuteState = (...args: unknown[]): void => {
    this.muted = args[0] === true;
    this.muteIcon.setTexture(this.muted ? TEX.glyphMuteOff : TEX.glyphMuteOn);
  };

  private setPrompt(id: InteractId | null): void {
    this.promptId = id;
    if (!this.chromeVisible) {
      return;
    }
    if (!id) {
      this.chip.setVisible(false);
      this.chipText.setVisible(false);
      this.chip.disableInteractive();
      this.chipHit.disableInteractive();
      this.chipHit.setVisible(false);
      return;
    }
    const text = promptText(id);
    this.chipText.setText(text);
    this.chipText.setVisible(true);
    const width = Math.max(80, Math.ceil(this.chipText.width) + 16);
    this.chip.setSize(width, CHIP_H);
    this.chipHit.setSize(width + 8, 22);
    this.chip.setVisible(true);
    this.chipHit.setVisible(true);
    this.chip.setInteractive({ useHandCursor: true });
    this.chipHit.setInteractive({ useHandCursor: true });
    this.layout();
  }

  private layout(): void {
    const view = applyHudCamera(this);
    this.viewW = view.width;
    this.viewH = view.height;
    this.postcard.setView(this.viewW, this.viewH);
    const cx = Math.floor(this.viewW / 2);

    // Stick dead-center, just above the bottom edge so it sits further
    // down the page without clipping the chevrons or handle.
    if (this.stickEnabled && this.stickHit) {
      const visualHalf = Math.max(5, Math.round(this.stickRadius * 0.2));
      const bottomPad = 8;
      this.stickCx = cx;
      this.stickCy = this.viewH - visualHalf - bottomPad;
      this.stickHit.setPosition(this.stickCx, this.stickCy);
      this.drawStick(this.stickX);
      this.chip.setPosition(cx, this.stickCy - 16);
      this.chipText.setPosition(cx, this.stickCy - 20);
      this.chipHit.setPosition(cx, this.stickCy - 14);
    } else {
      this.chip.setPosition(cx, this.viewH - 8);
      this.chipText.setPosition(cx, this.viewH - 12);
      this.chipHit.setPosition(cx, this.viewH - 6);
    }

    const clockCream = this.hudCream || this.isDark || this.mood === "rain";
    this.clockText.setTint(clockCream ? CREAM : INK);
    this.clockText.setPosition(Math.round(this.viewW - 10), 6);
    this.glyph.setPosition(Math.round(this.viewW - 12 - this.clockText.width), 6);
    this.cameraIcon.setPosition(6, 6);
    this.cameraHit.setPosition(4, 4);
    this.muteIcon.setTint(clockCream ? CREAM : INK);
    this.muteIcon.setPosition(8, 6);
  }
}

function glyphKey(mood: WeatherMood): string {
  switch (mood) {
    case "clearDay":
      return TEX.glyphClear;
    case "overcast":
      return TEX.glyphOvercast;
    case "rain":
      return TEX.glyphRain;
    case "fog":
      return TEX.glyphFog;
    case "night":
      return TEX.glyphNight;
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}
