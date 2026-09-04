import Phaser from "phaser";
import { TEX } from "./textures";
import {
  POSTCARD_SHOT_KEY,
  openPostcardShare,
  postcardPhotoRect,
} from "./postcard";

const INK = 0x100f0f;
const CREAM = 0xfffcf0;
const FONT_SIZE = 7;
const CHIP_H = 16;
const OUTER = 2;
const PAD = 8;
const GAP = 6;
const DEPTH = 50;
const CAPTION = "Greetings from the harbor";
const SHARE_LABEL = "Share on X";
const LATER_LABEL = "Keep walking";

type Hooks = {
  onOpen: () => void;
  onClose: () => void;
};

export class HarborPostcard {
  private readonly scene: Phaser.Scene;
  private readonly hooks: Hooks;
  private open = false;
  private capturing = false;
  private generation = 0;
  private viewW = 480;
  private viewH = 270;
  private photoW = 0;
  private photoH = 0;

  private swallow?: Phaser.GameObjects.Zone;
  private cardHit?: Phaser.GameObjects.Zone;
  private frame?: Phaser.GameObjects.Graphics;
  private photo?: Phaser.GameObjects.Image;
  private caption?: Phaser.GameObjects.BitmapText;
  private shareChip?: Phaser.GameObjects.NineSlice;
  private shareText?: Phaser.GameObjects.BitmapText;
  private laterChip?: Phaser.GameObjects.NineSlice;
  private laterText?: Phaser.GameObjects.BitmapText;
  private esc?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, hooks: Hooks) {
    this.scene = scene;
    this.hooks = hooks;
  }

  get isOpen(): boolean {
    return this.open;
  }

  setView(width: number, height: number): void {
    this.viewW = width;
    this.viewH = height;
    if (this.open) {
      this.layout();
    }
  }

  captureAndShow(viewW: number, viewH: number): void {
    if (this.open || this.capturing) {
      return;
    }
    this.viewW = viewW;
    this.viewH = viewH;
    this.capturing = true;
    const gen = ++this.generation;
    const rect = postcardPhotoRect(viewW, viewH);
    this.scene.game.renderer.snapshotArea(
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      (snap) => {
        this.capturing = false;
        if (gen !== this.generation || !this.scene.sys.isActive()) {
          return;
        }
        const image = snap instanceof HTMLImageElement ? snap : undefined;
        this.installShot(image, rect.width, rect.height);
        this.build();
        this.open = true;
        this.bindEsc(true);
        this.hooks.onOpen();
      },
    );
  }

  hide = (): void => {
    if (!this.open && !this.capturing) {
      return;
    }
    this.generation += 1;
    this.capturing = false;
    this.open = false;
    this.bindEsc(false);
    this.destroyParts();
    if (this.scene.textures.exists(POSTCARD_SHOT_KEY)) {
      this.scene.textures.remove(POSTCARD_SHOT_KEY);
    }
    this.hooks.onClose();
  };

  private installShot(
    image: HTMLImageElement | undefined,
    fallbackW: number,
    fallbackH: number,
  ): void {
    if (this.scene.textures.exists(POSTCARD_SHOT_KEY)) {
      this.scene.textures.remove(POSTCARD_SHOT_KEY);
    }
    if (!image) {
      this.photoW = fallbackW;
      this.photoH = fallbackH;
      return;
    }
    this.scene.textures.addImage(POSTCARD_SHOT_KEY, image);
    const tex = this.scene.textures.get(POSTCARD_SHOT_KEY);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.photoW = image.width || fallbackW;
    this.photoH = image.height || fallbackH;
  }

  private build(): void {
    this.destroyParts();

    this.swallow = this.scene.add
      .zone(0, 0, this.viewW, this.viewH)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive();
    this.swallow.on("pointerdown", this.hide);

    this.frame = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);

    this.cardHit = this.scene.add
      .zone(0, 0, 8, 8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setInteractive();

    if (this.scene.textures.exists(POSTCARD_SHOT_KEY)) {
      this.photo = this.scene.add
        .image(0, 0, POSTCARD_SHOT_KEY)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 3);
    }

    this.caption = this.scene.add
      .bitmapText(0, 0, "hud-font", CAPTION, FONT_SIZE)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 3)
      .setTint(INK);

    this.shareChip = this.makeChip();
    this.shareText = this.makeLabel(SHARE_LABEL);
    this.shareChip.on("pointerdown", () => openPostcardShare());

    this.laterChip = this.makeChip();
    this.laterText = this.makeLabel(LATER_LABEL);
    this.laterChip.on("pointerdown", this.hide);

    this.layout();
  }

  private makeChip(): Phaser.GameObjects.NineSlice {
    const chip = this.scene.add.nineslice(0, 0, TEX.chip, 0, 80, CHIP_H, 2, 2, 2, 2);
    chip.setOrigin(0.5, 0.5);
    chip.setScrollFactor(0);
    chip.setDepth(DEPTH + 4);
    chip.setInteractive({ useHandCursor: true });
    return chip;
  }

  private makeLabel(text: string): Phaser.GameObjects.BitmapText {
    return this.scene.add
      .bitmapText(0, 0, "hud-font", text, FONT_SIZE)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 5)
      .setTint(INK);
  }

  private layout(): void {
    if (!this.frame || !this.caption || !this.shareChip || !this.laterChip) {
      return;
    }
    if (!this.shareText || !this.laterText || !this.swallow || !this.cardHit) {
      return;
    }

    const photoW = this.photoW;
    const photoH = this.photoH;
    const shareW = Math.max(80, Math.ceil(this.shareText.width) + 16);
    const laterW = Math.max(80, Math.ceil(this.laterText.width) + 16);
    const buttonsW = shareW + GAP + laterW;
    const innerW = Math.max(photoW, Math.ceil(this.caption.width), buttonsW);
    const cardW = innerW + PAD * 2 + OUTER * 2;
    const cardH =
      OUTER + PAD + photoH + GAP + FONT_SIZE + GAP + CHIP_H + PAD + OUTER;
    const cardX = Math.floor((this.viewW - cardW) / 2);
    const cardY = Math.floor((this.viewH - cardH) / 2) + 6;
    const photoX = cardX + OUTER + PAD + Math.floor((innerW - photoW) / 2);
    const photoY = cardY + OUTER + PAD;
    const captionY = photoY + photoH + GAP;
    const btnY = captionY + FONT_SIZE + GAP + Math.floor(CHIP_H / 2);
    const btnMid = cardX + Math.floor(cardW / 2);
    const buttonsLeft = btnMid - Math.floor(buttonsW / 2);
    const shareX = buttonsLeft + Math.floor(shareW / 2);
    const laterX = buttonsLeft + shareW + GAP + Math.floor(laterW / 2);

    this.swallow.setPosition(0, 0);
    this.swallow.setSize(this.viewW, this.viewH);
    this.cardHit.setPosition(cardX, cardY);
    this.cardHit.setSize(cardW, cardH);

    this.frame.clear();
    this.frame.fillStyle(INK, 1);
    this.frame.fillRect(cardX, cardY, cardW, cardH);
    this.frame.fillStyle(CREAM, 1);
    this.frame.fillRect(cardX + OUTER, cardY + OUTER, cardW - OUTER * 2, cardH - OUTER * 2);
    this.frame.fillStyle(INK, 1);
    this.frame.fillRect(photoX - 1, photoY - 1, photoW + 2, photoH + 2);
    if (!this.photo) {
      this.frame.fillStyle(CREAM, 1);
      this.frame.fillRect(photoX, photoY, photoW, photoH);
    }

    this.photo?.setPosition(photoX, photoY);
    this.caption.setPosition(btnMid, captionY);
    this.shareChip.setSize(shareW, CHIP_H);
    this.shareChip.setPosition(shareX, btnY);
    this.shareText.setPosition(shareX, btnY);
    this.laterChip.setSize(laterW, CHIP_H);
    this.laterChip.setPosition(laterX, btnY);
    this.laterText.setPosition(laterX, btnY);
  }

  private bindEsc(on: boolean): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      return;
    }
    if (on) {
      this.esc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.esc.on("down", this.hide);
      return;
    }
    this.esc?.off("down", this.hide);
    if (this.esc) {
      keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.esc = undefined;
    }
  }

  private destroyParts(): void {
    this.swallow?.destroy();
    this.cardHit?.destroy();
    this.frame?.destroy();
    this.photo?.destroy();
    this.caption?.destroy();
    this.shareChip?.destroy();
    this.shareText?.destroy();
    this.laterChip?.destroy();
    this.laterText?.destroy();
    this.swallow = undefined;
    this.cardHit = undefined;
    this.frame = undefined;
    this.photo = undefined;
    this.caption = undefined;
    this.shareChip = undefined;
    this.shareText = undefined;
    this.laterChip = undefined;
    this.laterText = undefined;
  }
}
