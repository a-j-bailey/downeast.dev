# Harbor art

**New art is generated as pixel sheets and sliced into `public/harbor/processed/`. It is NEVER hand-drawn in code.**

## Source of truth

`public/harbor/source/sheets/` holds the raw 1536×1024 generated sheets. Those files are **not** loaded at runtime. Production builds omit them from `dist/` so the Worker stays small; they remain in git.

## Runtime sprites

`public/harbor/processed/` is what Phaser loads:

```
this.load.image('coffee-shop', '/harbor/processed/coffee-shop.png')
```

Processed means: game-scale, cream keyed, 1px fringe eroded, alpha-bled. **Use these.** Do not redraw, recolor, upscale, or run them through a filter.

Locked files:

- `cafe-interior.png` — cafe Interior scene. Do not restyle. Keep processed game-scale (not the 1536×1024 source sheet).
- `water.png` — 64×32 power-of-two wave tile for `TileSprite`. Must stay POT.

Player frames (25×43, bottom-aligned, right-facing):

- `player-idle`
- `player-walk-0` … `player-walk-3`
- `player-use`

FlipX for left. No white fringe on dark backgrounds.

Kayak + paddle are STREAM set dressing. The kayak is the Weather Otter interact (`projects.ts`); the paddle is a prop only.

## Ingest

`scripts/process-harbor-art.py` is ingest only. It never generates art. Point it at a folder of sliced sprites, then copy the output into `public/harbor/processed/`.

If you need a new prop: generate a sheet, drop it in `source/sheets/`, slice and process, commit the PNG. Do not `fillRect` a shack.
