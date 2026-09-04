import type Phaser from "phaser";

export const TEX = {
  rain: "ui-rain",
  chip: "ui-chip",
  glyphClear: "ui-glyph-clear",
  glyphOvercast: "ui-glyph-overcast",
  glyphRain: "ui-glyph-rain",
  glyphFog: "ui-glyph-fog",
  glyphNight: "ui-glyph-night",
} as const;

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

function fillTile(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  g.fillRect(0, 0, width, height);
}

/**
 * Procedural stand-ins if processed PNGs failed to load. Real art in
 * public/harbor/processed/ always wins because stamp() skips existing keys.
 */
export function ensureHarborFallbacks(scene: Phaser.Scene): void {
  stamp(scene, "water-deep", 64, 56, (g) => {
    fillTile(g, 64, 56, 0x052a4a);
    g.fillStyle(0x0a4e7c, 1);
    for (let y = 4; y < 56; y += 7) {
      g.fillRect(0, y, 64, 1);
    }
    g.fillStyle(0x3478b0, 1);
    g.fillRect(8, 10, 2, 1);
    g.fillRect(28, 24, 2, 1);
    g.fillRect(48, 38, 2, 1);
  });

  stamp(scene, "waves-foam", 64, 16, (g) => {
    g.fillStyle(0xe6f2f8, 0.85);
    g.fillRect(0, 6, 64, 1);
    g.fillRect(4, 5, 8, 1);
    g.fillRect(20, 7, 10, 1);
    g.fillRect(40, 5, 12, 1);
  });

  stamp(scene, "road-stone", 64, 48, (g) => {
    fillTile(g, 64, 48, 0x5c4e30);
    g.fillStyle(0x4e4228, 1);
    g.fillRect(4, 6, 10, 8);
    g.fillRect(22, 18, 12, 7);
    g.fillRect(40, 8, 9, 9);
    g.fillStyle(0x6e6a5e, 1);
    g.fillRect(12, 28, 8, 6);
    g.fillRect(36, 32, 11, 5);
  });

  stamp(scene, "wharf-planks", 64, 32, (g) => {
    fillTile(g, 64, 32, 0x765630);
    g.fillStyle(0x342016, 1);
    for (let x = 0; x < 64; x += 16) {
      g.fillRect(x, 0, 1, 32);
    }
    g.fillRect(0, 0, 64, 1);
    g.fillRect(0, 31, 64, 1);
    g.fillStyle(0x8e6c40, 1);
    g.fillRect(1, 0, 1, 32);
    g.fillRect(17, 0, 1, 32);
    g.fillRect(33, 0, 1, 32);
    g.fillRect(49, 0, 1, 32);
  });

  stamp(scene, "glow-window", 8, 8, (g) => {
    g.fillStyle(0xffc878, 0.9);
    g.fillRect(2, 2, 4, 4);
    g.fillStyle(0xfff4c8, 1);
    g.fillRect(3, 3, 2, 2);
  });

  stamp(scene, "glow-street", 12, 16, (g) => {
    g.fillStyle(0xffb040, 0.7);
    g.fillRect(3, 4, 6, 8);
    g.fillStyle(0xfff2c0, 1);
    g.fillRect(5, 6, 2, 4);
  });

  stamp(scene, "boat-nav-lights", 171, 51, (g) => {
    g.fillStyle(0xff3355, 1);
    g.fillRect(14, 20, 3, 3);
    g.fillStyle(0x44ff88, 1);
    g.fillRect(154, 20, 3, 3);
    g.fillStyle(0xfff5e0, 1);
    g.fillRect(84, 2, 3, 3);
    g.fillRect(160, 14, 2, 2);
  });

  stamp(scene, "player-walk-pass", 25, 43, (g) => {
    // Tiny placeholder; real pass frame is player-walk-pass.png.
    g.fillStyle(0x2a4a7a, 1);
    g.fillRect(8, 8, 10, 18);
    g.fillStyle(0x6a7034, 1);
    g.fillRect(9, 26, 8, 12);
  });

  stamp(scene, "player-idle-stand", 25, 43, (g) => {
    g.fillStyle(0x2a4a7a, 1);
    g.fillRect(8, 8, 10, 18);
    g.fillStyle(0x6a7034, 1);
    g.fillRect(9, 26, 8, 14);
  });
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
}
