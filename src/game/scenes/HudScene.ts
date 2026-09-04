import Phaser from "phaser";
import { applyHudCamera } from "../camera";
import { EventBus } from "../EventBus";
import { promptText, type InteractId } from "../interact";
import { TEX } from "../textures";
import { shouldShowVirtualStick } from "../touchControls";
import { nyClock, type WeatherMood } from "../weather";

const STICK_DEADZONE = 0.15;
const CHIP_H = 24;

export class HudScene extends Phaser.Scene {
  private viewW = 480;
  private viewH = 270;
  private chip!: Phaser.GameObjects.NineSlice;
  private chipText!: Phaser.GameObjects.Text;
  private glyph!: Phaser.GameObjects.Image;
  private clockText!: Phaser.GameObjects.Text;
  private mood: WeatherMood = "clearDay";

  private stickEnabled = false;
  private stickBase?: Phaser.GameObjects.Graphics;
  private stickKnob?: Phaser.GameObjects.Graphics;
  private stickHit?: Phaser.GameObjects.Zone;
  private stickCx = 0;
  private stickCy = 0;
  private stickRadius = 28;
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
    }
    this.chip = this.add.nineslice(0, 0, TEX.chip, 0, 120, CHIP_H, 2, 2, 2, 2);
    this.chip.setOrigin(0.5, 1);
    this.chip.setScrollFactor(0);
    this.chip.setDepth(20);
    this.chip.setInteractive({ useHandCursor: true });
    this.chip.on("pointerdown", () => {
      EventBus.emit("harbor-interact");
    });

    this.chipText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "700",
        color: "#100f0f",
        resolution: 2,
        stroke: "#fffcf0",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(21)
      .setPadding(0, 2, 0, 2);

    this.glyph = this.add.image(0, 0, TEX.glyphClear).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
    this.clockText = this.add
      .text(0, 0, nyClock(), {
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "700",
        color: "#fffcf0",
        resolution: 2,
        stroke: "#100f0f",
        strokeThickness: 2,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setPadding(0, 2, 0, 2);

    this.stickEnabled = shouldShowVirtualStick();
    if (this.stickEnabled) {
      this.buildStick();
    }

    this.layout();
    this.setPrompt(null);

    this.scale.on("resize", this.onResize, this);
    EventBus.on("harbor-prompt", this.onPrompt);
    EventBus.on("harbor-weather", this.onWeather);
    this.events.once("shutdown", () => {
      EventBus.off("harbor-prompt", this.onPrompt);
      EventBus.off("harbor-weather", this.onWeather);
      this.scale.off("resize", this.onResize, this);
      this.emitStick(0);
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.clockText.setText(nyClock());
      },
    });
  }

  private buildStick(): void {
    const r = this.stickRadius;
    this.stickBase = this.add.graphics().setScrollFactor(0).setDepth(18).setAlpha(0.55);
    this.stickKnob = this.add.graphics().setScrollFactor(0).setDepth(19).setAlpha(0.85);
    this.stickHit = this.add
      .zone(0, 0, r * 2.6, r * 2.6)
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
    // Horizontal only — ignore vertical pull.
    const raw = Phaser.Math.Clamp(dx / this.stickRadius, -1, 1);
    const x = Math.abs(raw) < STICK_DEADZONE ? 0 : raw;
    this.stickX = x;
    this.drawStick(x);
    this.emitStick(x);
  }

  private emitStick(x: number): void {
    EventBus.emit("harbor-stick", { x });
  }

  private drawStick(axisX: number): void {
    if (!this.stickBase || !this.stickKnob) {
      return;
    }
    const r = this.stickRadius;
    this.stickBase.clear();
    this.stickBase.fillStyle(0x100f0f, 0.45);
    this.stickBase.fillCircle(this.stickCx, this.stickCy, r);
    this.stickBase.lineStyle(2, 0xfffcf0, 0.7);
    this.stickBase.strokeCircle(this.stickCx, this.stickCy, r);

    const knobX = this.stickCx + axisX * (r - 8);
    this.stickKnob.clear();
    this.stickKnob.fillStyle(0xfffcf0, 0.9);
    this.stickKnob.fillCircle(knobX, this.stickCy, 10);
    this.stickKnob.lineStyle(1, 0x100f0f, 0.8);
    this.stickKnob.strokeCircle(knobX, this.stickCy, 10);
  }

  private onResize = (): void => {
    if (!this.sys.isActive()) {
      return;
    }
    this.layout();
  };

  private onPrompt = (...args: unknown[]): void => {
    const id = (args[0] ?? null) as InteractId | null;
    this.setPrompt(id);
  };

  private onWeather = (...args: unknown[]): void => {
    const mood = args[0];
    if (
      mood === "clearDay" ||
      mood === "overcast" ||
      mood === "rain" ||
      mood === "fog" ||
      mood === "night"
    ) {
      this.mood = mood;
      this.glyph.setTexture(glyphKey(mood));
    }
  };

  private setPrompt(id: InteractId | null): void {
    if (!id) {
      this.chip.setVisible(false);
      this.chipText.setVisible(false);
      this.chip.disableInteractive();
      return;
    }
    const text = promptText(id);
    this.chipText.setText(text);
    this.chipText.setVisible(true);
    const width = Math.max(96, Math.ceil(this.chipText.width) + 20);
    this.chip.setSize(width, CHIP_H);
    this.chip.setVisible(true);
    this.chip.setInteractive({ useHandCursor: true });
    this.layout();
  }

  private layout(): void {
    const view = applyHudCamera(this);
    this.viewW = view.width;
    this.viewH = view.height;
    const cx = Math.floor(this.viewW / 2);
    const by = this.viewH - 8;
    this.chip.setPosition(cx, by);
    this.chipText.setPosition(cx, by - 4);
    this.clockText.setPosition(this.viewW - 6, 6);
    this.glyph.setPosition(this.viewW - 8 - this.clockText.width, 6);
    this.clockText.setColor(this.mood === "night" || this.mood === "rain" ? "#fffcf0" : "#100f0f");
    this.clockText.setStroke(
      this.mood === "night" || this.mood === "rain" ? "#100f0f" : "#fffcf0",
      2,
    );

    if (this.stickEnabled && this.stickHit) {
      this.stickCx = 44;
      this.stickCy = this.viewH - 44;
      this.stickHit.setPosition(this.stickCx, this.stickCy);
      this.drawStick(this.stickX);
    }
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
