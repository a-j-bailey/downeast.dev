import Phaser from "phaser";
import { applyHudCamera } from "../camera";
import { EventBus } from "../EventBus";
import { promptText, type InteractId } from "../interact";
import { TEX } from "../textures";
import { nyClock, type WeatherMood } from "../weather";

export class HudScene extends Phaser.Scene {
  private viewW = 480;
  private viewH = 270;
  private chip!: Phaser.GameObjects.NineSlice;
  private chipText!: Phaser.GameObjects.Text;
  private glyph!: Phaser.GameObjects.Image;
  private clockText!: Phaser.GameObjects.Text;
  private mood: WeatherMood = "clearDay";

  constructor() {
    super({ key: "Hud" });
  }

  create(): void {
    const hudCam = this.cameras.main;
    if (hudCam) {
      hudCam.transparent = true;
      hudCam.setBackgroundColor("rgba(0,0,0,0)");
    }
    this.chip = this.add.nineslice(0, 0, TEX.chip, 0, 96, 16, 2, 2, 2, 2);
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
        fontSize: "8px",
        color: "#100f0f",
        resolution: 8,
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(21);

    this.glyph = this.add.image(0, 0, TEX.glyphClear).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
    this.clockText = this.add
      .text(0, 0, nyClock(), {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#fffcf0",
        resolution: 8,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20);

    this.layout();
    this.setPrompt(null);

    this.scale.on("resize", this.onResize, this);
    EventBus.on("harbor-prompt", this.onPrompt);
    EventBus.on("harbor-weather", this.onWeather);
    this.events.once("shutdown", () => {
      EventBus.off("harbor-prompt", this.onPrompt);
      EventBus.off("harbor-weather", this.onWeather);
      this.scale.off("resize", this.onResize, this);
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.clockText.setText(nyClock());
      },
    });
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
    const width = Math.max(72, Math.ceil(this.chipText.width) + 12);
    this.chip.setSize(width, 16);
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
    this.chipText.setPosition(cx, by - 3);
    this.clockText.setPosition(this.viewW - 6, 6);
    this.glyph.setPosition(this.viewW - 8 - this.clockText.width, 6);
    this.clockText.setColor(this.mood === "night" || this.mood === "rain" ? "#fffcf0" : "#100f0f");
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
