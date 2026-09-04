import type Phaser from "phaser";

export const TEX = {
  rain: "ui-rain",
  chip: "ui-chip",
  glyphClear: "ui-glyph-clear",
  glyphOvercast: "ui-glyph-overcast",
  glyphRain: "ui-glyph-rain",
  glyphFog: "ui-glyph-fog",
  glyphNight: "ui-glyph-night",
  glyphMuteOn: "ui-glyph-mute-on",
  glyphMuteOff: "ui-glyph-mute-off",
} as const;

/** Cream mute chip (game pixels). Hit pad is larger than the sprite. */
export const MUTE_CHIP = 20;
export const MUTE_HIT = 32;
export const MUTE_INSET = 10;

function stamp(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }
  const g = scene.add.graphics();
  g.setVisible(false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

/** HUD chrome and rain drops — not scenery. Art look stays in processed PNGs. */
export function ensureUiTextures(scene: Phaser.Scene): void {
  stamp(scene, TEX.rain, 1, 5, (g) => {
    g.fillStyle(0xc5d8ea, 1);
    g.fillRect(0, 0, 1, 5);
  });

  stamp(scene, TEX.chip, 8, 8, (g) => {
    g.fillStyle(0x100f0f, 1);
    g.fillRect(0, 0, 8, 8);
    g.fillStyle(0xfffcf0, 1);
    g.fillRect(1, 1, 6, 6);
  });

  stamp(scene, TEX.glyphClear, 7, 7, (g) => {
    g.fillStyle(0xf0d070, 1);
    g.fillRect(2, 2, 3, 3);
    g.fillRect(3, 0, 1, 7);
    g.fillRect(0, 3, 7, 1);
  });

  stamp(scene, TEX.glyphOvercast, 7, 7, (g) => {
    g.fillStyle(0xd8d4c8, 1);
    g.fillRect(1, 3, 5, 2);
    g.fillRect(2, 2, 3, 1);
  });

  stamp(scene, TEX.glyphRain, 7, 7, (g) => {
    g.fillStyle(0xd8d4c8, 1);
    g.fillRect(1, 1, 5, 2);
    g.fillStyle(0x8eb4d2, 1);
    g.fillRect(2, 4, 1, 2);
    g.fillRect(4, 5, 1, 2);
  });

  stamp(scene, TEX.glyphFog, 7, 7, (g) => {
    g.fillStyle(0xc8ccc8, 1);
    g.fillRect(0, 2, 5, 1);
    g.fillRect(2, 4, 5, 1);
    g.fillRect(1, 6, 4, 1);
  });

  stamp(scene, TEX.glyphNight, 7, 7, (g) => {
    g.fillStyle(0xe8e0c8, 1);
    g.fillRect(3, 1, 3, 5);
    g.fillStyle(0x1a2233, 1);
    g.fillRect(2, 2, 2, 3);
  });

  stamp(scene, TEX.glyphMuteOn, MUTE_CHIP, MUTE_CHIP, (g) => {
    drawMuteChip(g, false);
  });

  stamp(scene, TEX.glyphMuteOff, MUTE_CHIP, MUTE_CHIP, (g) => {
    drawMuteChip(g, true);
  });
}

function drawMuteChip(g: Phaser.GameObjects.Graphics, muted: boolean): void {
  g.fillStyle(0x100f0f, 1);
  g.fillRect(0, 0, MUTE_CHIP, MUTE_CHIP);
  g.fillStyle(0xfffcf0, 1);
  g.fillRect(1, 1, MUTE_CHIP - 2, MUTE_CHIP - 2);
  g.fillStyle(0x100f0f, 1);
  g.fillRect(3, 7, 4, 6);
  g.fillRect(7, 6, 1, 8);
  g.fillRect(8, 4, 1, 12);
  g.fillRect(9, 3, 1, 14);
  if (muted) {
    g.fillRect(3, 3, 2, 1);
    g.fillRect(5, 4, 2, 1);
    g.fillRect(7, 5, 2, 1);
    g.fillRect(9, 7, 2, 1);
    g.fillRect(11, 9, 2, 1);
    g.fillRect(13, 11, 2, 1);
    g.fillRect(15, 13, 2, 1);
    g.fillRect(16, 15, 2, 1);
    return;
  }
  g.fillRect(12, 6, 1, 8);
  g.fillRect(14, 4, 1, 12);
  g.fillRect(16, 6, 1, 8);
}
