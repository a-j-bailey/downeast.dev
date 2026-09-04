import Phaser from "phaser";
import { TEX } from "./textures";
import {
  POSTCARD_ART_H,
  POSTCARD_ART_KEY,
  POSTCARD_ART_W,
  POSTCARD_STAMP_KEY,
  openPostcardShare,
} from "./postcard";

const INK = 0x100f0f;
const CREAM = 0xfffcf0;
const FONT_SIZE = 7;
const OUTER = 2;
const PAD = 6;
const GAP = 5;
const BTN_H = 16;
const DEPTH = 50;
const LINE1 = "GREETINGS FROM";
const LINE2 = "DOWNEAST.DEV";
const SHARE_LABEL = "SHARE ON X";
const LATER_LABEL = "KEEP WALKING";

type Hooks = {
  onOpen: () => void;
  onClose: () => void;
};

export class HarborPostcard {
  private readonly scene: Phaser.Scene;
  private readonly hooks: Hooks;
  private open = false;
  private viewW = 480;
  private viewH = 270;

  private swallow?: Phaser.GameObjects.Zone;
  private cardHit?: Phaser.GameObjects.Zone;
  private frame?: Phaser.GameObjects.Graphics;
  private grain?: Phaser.GameObjects.TileSprite;
  private photo?: Phaser.GameObjects.Image;
  private stamp?: Phaser.GameObjects.Image;
  private cancel?: Phaser.GameObjects.Graphics;
  private line1?: Phaser.GameObjects.BitmapText;
  private line2?: Phaser.GameObjects.BitmapText;
  private shareHit?: Phaser.GameObjects.Zone;
  private laterHit?: Phaser.GameObjects.Zone;
  private shareText?: Phaser.GameObjects.BitmapText;
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

  show(viewW: number, viewH: number): void {
    if (this.open) {
      return;
    }
    this.viewW = viewW;
    this.viewH = viewH;
    this.build();
    this.open = true;
    this.bindEsc(true);
    this.hooks.onOpen();
  }

  hide = (): void => {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.bindEsc(false);
    this.destroyParts();
    this.hooks.onClose();
  };

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
    this.grain = this.scene.add
      .tileSprite(0, 0, 16, 16, TEX.grain)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setAlpha(0.55);

    this.cardHit = this.scene.add
      .zone(0, 0, 8, 8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 3)
      .setInteractive();

    if (this.scene.textures.exists(POSTCARD_ART_KEY)) {
      this.photo = this.scene.add
        .image(0, 0, POSTCARD_ART_KEY)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 4);
      this.photo.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    if (this.scene.textures.exists(POSTCARD_STAMP_KEY)) {
      this.stamp = this.scene.add
        .image(0, 0, POSTCARD_STAMP_KEY)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 6);
      this.stamp.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.cancel = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 7);

    this.line1 = this.makeCaption(LINE1);
    this.line2 = this.makeCaption(LINE2);

    this.shareHit = this.makeButtonHit(() => openPostcardShare());
    this.laterHit = this.makeButtonHit(this.hide);
    this.shareText = this.makeCaption(SHARE_LABEL);
    this.laterText = this.makeCaption(LATER_LABEL);
    this.laterText.setTint(CREAM);

    this.layout();
  }

  private makeCaption(text: string): Phaser.GameObjects.BitmapText {
    return this.scene.add
      .bitmapText(0, 0, "hud-font", text, FONT_SIZE)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 8)
      .setTint(INK);
  }

  private makeButtonHit(onDown: () => void): Phaser.GameObjects.Zone {
    const zone = this.scene.add
      .zone(0, 0, 80, BTN_H)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 9)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerdown", onDown);
    return zone;
  }

  private layout(): void {
    if (!this.frame || !this.grain || !this.swallow || !this.cardHit) {
      return;
    }
    if (!this.line1 || !this.line2 || !this.shareText || !this.laterText) {
      return;
    }
    if (!this.shareHit || !this.laterHit || !this.cancel) {
      return;
    }

    const box = this.cardBox();
    this.swallow.setPosition(0, 0);
    this.swallow.setSize(this.viewW, this.viewH);
    this.cardHit.setPosition(box.x, box.y);
    this.cardHit.setSize(box.w, box.h);

    this.frame.clear();
    this.frame.fillStyle(INK, 1);
    this.frame.fillRect(box.x, box.y, box.w, box.h);
    this.frame.fillStyle(CREAM, 1);
    this.frame.fillRect(box.x + OUTER, box.y + OUTER, box.w - OUTER * 2, box.h - OUTER * 2);
    this.frame.fillStyle(INK, 1);
    this.frame.fillRect(box.photoX - 1, box.photoY - 1, box.photoW + 2, box.photoH + 2);

    this.grain.setPosition(box.x + OUTER, box.y + OUTER);
    this.grain.setSize(box.w - OUTER * 2, box.h - OUTER * 2);

    if (this.photo) {
      this.photo.setCrop(box.cropX, box.cropY, box.photoW, box.photoH);
      this.photo.setDisplaySize(box.photoW, box.photoH);
      this.photo.setPosition(box.photoX - box.cropX, box.photoY - box.cropY);
    }

    if (box.splitX > 0) {
      this.frame.fillStyle(INK, 0.35);
      this.frame.fillRect(box.splitX, box.y + OUTER + PAD, 1, box.h - (OUTER + PAD) * 2);
      dashHLine(this.frame, box.writeX, box.lineY, box.writeW);
      dashHLine(this.frame, box.writeX, box.lineY + 6, box.writeW);
      dashHLine(this.frame, box.writeX, box.lineY + 12, Math.floor(box.writeW * 0.7));
    }

    this.line1.setPosition(box.writeX, box.captionY);
    this.line2.setPosition(box.writeX, box.captionY + FONT_SIZE + 2);

    drawStampButton(this.frame, box.shareX, box.btnY, box.btnW, BTN_H);
    drawKeepWalking(this.frame, box.laterX, box.btnY, box.btnW, BTN_H);
    this.shareHit.setPosition(box.shareX, box.btnY);
    this.shareHit.setSize(box.btnW, BTN_H);
    this.laterHit.setPosition(box.laterX, box.btnY);
    this.laterHit.setSize(box.btnW, BTN_H);
    this.shareText.setPosition(box.shareX + 5, box.btnY + 3);
    this.laterText.setPosition(box.laterX + 5, box.btnY + 4);

    const stampW = this.stamp?.width ?? 0;
    const stampH = this.stamp?.height ?? 0;
    this.stamp?.setPosition(box.stampX, box.stampY);
    this.cancel.clear();
    if (this.stamp && stampW > 0) {
      drawCancel(this.cancel, box.stampX + Math.floor(stampW / 2), box.stampY + Math.floor(stampH / 2) + 2);
    }
  }

  private cardBox(): {
    x: number;
    y: number;
    w: number;
    h: number;
    photoX: number;
    photoY: number;
    photoW: number;
    photoH: number;
    cropX: number;
    cropY: number;
    writeX: number;
    writeW: number;
    splitX: number;
    captionY: number;
    lineY: number;
    stampX: number;
    stampY: number;
    shareX: number;
    laterX: number;
    btnY: number;
    btnW: number;
  } {
    const nativeW = this.photo?.frame.width || POSTCARD_ART_W;
    const nativeH = this.photo?.frame.height || POSTCARD_ART_H;
    const shareW = Math.max(78, Math.ceil(this.shareText?.width ?? 60) + 10);
    const laterW = Math.max(78, Math.ceil(this.laterText?.width ?? 60) + 10);
    const btnW = Math.max(shareW, laterW);
    const buttonsW = btnW * 2 + GAP;
    const captionW = Math.max(
      Math.ceil(this.line1?.width ?? 80),
      Math.ceil(this.line2?.width ?? 80),
    );
    const stampW = this.stamp?.width ?? 24;
    const stampH = this.stamp?.height ?? 24;
    const sideBySide = this.viewW >= 400;
    const writeCol = Math.max(captionW, buttonsW, stampW + 4);

    let photoW = nativeW;
    let photoH = nativeH;
    const maxCardW = this.viewW - 56;
    const maxCardH = this.viewH - 36;

    if (sideBySide) {
      const wantW = OUTER * 2 + PAD + photoW + GAP + writeCol + PAD;
      if (wantW > maxCardW) {
        photoW = Math.max(96, maxCardW - (OUTER * 2 + PAD + GAP + writeCol + PAD));
      }
      const writeH = stampH + GAP + FONT_SIZE * 2 + 4 + 20 + GAP + BTN_H;
      const bodyH = Math.max(photoH, writeH);
      const cardW = OUTER * 2 + PAD + photoW + GAP + writeCol + PAD;
      const cardH = OUTER * 2 + PAD + bodyH + PAD;
      const x = Math.floor((this.viewW - cardW) / 2);
      const y = Math.floor((this.viewH - Math.min(cardH, maxCardH)) / 2);
      const photoX = x + OUTER + PAD;
      const photoY = y + OUTER + PAD;
      const writeX = photoX + photoW + GAP + 4;
      const cropX = Math.floor((nativeW - photoW) / 2);
      const cropY = Math.floor((nativeH - photoH) / 2);
      const captionY = photoY + stampH + GAP;
      return {
        x,
        y,
        w: cardW,
        h: cardH,
        photoX,
        photoY,
        photoW,
        photoH,
        cropX,
        cropY,
        writeX,
        writeW: writeCol,
        splitX: photoX + photoW + Math.floor(GAP / 2) + 1,
        captionY,
        lineY: captionY + FONT_SIZE * 2 + 8,
        stampX: writeX + writeCol - stampW,
        stampY: photoY,
        shareX: writeX,
        laterX: writeX + btnW + GAP,
        btnY: photoY + bodyH - BTN_H,
        btnW,
      };
    }

    const chromeW = OUTER * 2 + PAD * 2;
    const chromeH = OUTER * 2 + PAD * 2 + FONT_SIZE * 2 + 4 + GAP + BTN_H + GAP;
    photoW = Math.min(nativeW, Math.max(96, maxCardW - chromeW));
    photoH = Math.min(nativeH, Math.max(64, maxCardH - chromeH));
    const innerW = Math.max(photoW, captionW, buttonsW, stampW);
    const cardW = innerW + chromeW;
    const cardH = photoH + chromeH;
    const x = Math.floor((this.viewW - cardW) / 2);
    const y = Math.floor((this.viewH - cardH) / 2);
    const photoX = x + OUTER + PAD + Math.floor((innerW - photoW) / 2);
    const photoY = y + OUTER + PAD;
    const writeX = x + OUTER + PAD;
    const captionY = photoY + photoH + GAP;
    const btnY = captionY + FONT_SIZE * 2 + 4 + GAP;
    const cropX = Math.floor((nativeW - photoW) / 2);
    const cropY = Math.floor((nativeH - photoH) / 2);
    return {
      x,
      y,
      w: cardW,
      h: cardH,
      photoX,
      photoY,
      photoW,
      photoH,
      cropX,
      cropY,
      writeX,
      writeW: innerW,
      splitX: 0,
      captionY,
      lineY: 0,
      stampX: photoX + photoW - stampW + 2,
      stampY: photoY - 4,
      shareX: writeX,
      laterX: writeX + btnW + GAP,
      btnY,
      btnW,
    };
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
    this.grain?.destroy();
    this.photo?.destroy();
    this.stamp?.destroy();
    this.cancel?.destroy();
    this.line1?.destroy();
    this.line2?.destroy();
    this.shareHit?.destroy();
    this.laterHit?.destroy();
    this.shareText?.destroy();
    this.laterText?.destroy();
    this.swallow = undefined;
    this.cardHit = undefined;
    this.frame = undefined;
    this.grain = undefined;
    this.photo = undefined;
    this.stamp = undefined;
    this.cancel = undefined;
    this.line1 = undefined;
    this.line2 = undefined;
    this.shareHit = undefined;
    this.laterHit = undefined;
    this.shareText = undefined;
    this.laterText = undefined;
  }
}

function drawKeepWalking(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(INK, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(CREAM, 1);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(INK, 1);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
}

function dashHLine(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number): void {
  g.fillStyle(INK, 0.4);
  let i = 0;
  while (i < width) {
    const run = Math.min(3, width - i);
    g.fillRect(x + i, y, run, 1);
    i += run + 2;
  }
}

function drawStampButton(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(INK, 1);
  dashRect(g, x, y, w, h);
  dashRect(g, x + 1, y + 1, w - 2, h - 2);
}

function dashRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const on = 2;
  const off = 1;
  for (let i = 0; i < w; i += on + off) {
    g.fillRect(x + i, y, Math.min(on, w - i), 1);
    g.fillRect(x + i, y + h - 1, Math.min(on, w - i), 1);
  }
  for (let i = 0; i < h; i += on + off) {
    g.fillRect(x, y + i, 1, Math.min(on, h - i));
    g.fillRect(x + w - 1, y + i, 1, Math.min(on, h - i));
  }
}

function drawCancel(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  g.lineStyle(1, INK, 0.55);
  g.strokeCircle(cx, cy, 11);
  g.strokeCircle(cx, cy, 8);
  g.beginPath();
  g.moveTo(cx - 14, cy + 3);
  g.lineTo(cx + 12, cy - 6);
  g.strokePath();
  g.beginPath();
  g.moveTo(cx - 12, cy + 6);
  g.lineTo(cx + 14, cy - 3);
  g.strokePath();
}
