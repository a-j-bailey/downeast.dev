---
name: harbor-world
description: Harbor Phaser game on downeast.dev. Pixel sheets are the art source of truth; never draw the look in code.
---

# Harbor world

The homepage is a Phaser 4 side-view game. React only mounts it.

## Art (non-negotiable)

New art is generated as pixel sheets and sliced into `public/harbor/processed/`. It is **never** hand-drawn in code, Canvas, Graphics, or Pillow.

- Source of truth: `public/harbor/source/sheets/` (raw 1536×1024 generated sheets).
- Runtime: `public/harbor/processed/*.png` — game-scale, cream keyed, 1px eroded, alpha-bled.
- Ingest only: `scripts/process-harbor-art.py`. It does not generate art.
- Locked: `cafe-interior.png`, `water.png` (64×32 POT for TileSprite). Do not restyle, recolor, upscale, or filter.
- Player frames are 25×43, bottom-aligned, right-facing: `player-idle`, `player-walk-0..3`, `player-use`. FlipX for left.
- Load with `this.load.image('x', '/harbor/processed/x.png')`. Never import PNGs into the JS bundle. Never load the 1536px sheets at runtime.

See `harbor/ART.md` and `harbor/PROMPTS.md`.

## Engine

- Pin `phaser@4`. Isolate it. Official pattern: one React wrapper (`src/components/HarborGame.tsx`) `new Phaser.Game({ parent })` in `useEffect`, `destroy(true)` on unmount, `src/game/EventBus.ts` for React↔game.
- **Never** import `phaser` from a module Workers/SSR might evaluate. Dynamic-import `src/game/createGame.ts` inside `useEffect` only. Do not use `@phaserjs/react`.
- Split Phaser into its own async chunk (`vite.config.ts` `manualChunks`).
- Logical view **480×270**, `render.pixelArt: true`, `roundPixels: true`, integer zoom. Extra world on wide screens; do not letterbox with black bars if you can cover.
- Canvas CSS: `image-rendering: pixelated`.
- If Phaser 4 cone lights or MAX_ZOOM misbehave, drop to Phaser 3.90 with the **same** architecture. Do not mix 3 and 4 APIs.

## Scenes

- `Boot` — tiny pixel loader, then Harbor as soon as sky + water + player + one building are in. Stream the rest.
- `Harbor` — overworld.
- `Interior` — cafe keyed by data (`scene.start` / pause+launch). Not a React modal. Esc/door fades back.
- `Hud` — launched in parallel. Does **not** follow the world camera. Bitmap/nine-slice chip + weather glyph + clock. No HTML captions.

The wordmark is the **one** allowed DOM overlay (`pointer-events: none`) in the sky third.

## Layers

`src/game/layers.ts` is the single source of truth for `scrollFactor`:

| layer | scrollFactor |
| sky | 0 |
| far shore + lighthouse | 0.15 |
| water TileSprite | 0.4 |
| land, pier, buildings | 1 |
| actors (player, boat, kayak, shark) | 1, depth = y |
| lighthouse beam | 1, on scene root |
| foreground posts/rail | 1.15 |

Lights cannot live in Containers. Put the cone light on the scene root. Night: beam on and rotating. Day: beam off.

## Feel

- WASD + arrows. Pointer/tap-to-walk. E / tap the HUD chip on an InteractZone.
- Boat is possession, not a costume. `walker | boat`. E at the pier mounts; E at a pylon dismounts. Wake TileSprite behind the hull. Water is the walkable bound while boating.
- Signposts are in-world. E does `window.open` using URLs in `src/content/site.ts`.
- Weather: Open-Meteo Bristol RI, five moods, 15–30 min cache, `?weather=night` to force the beam. Do not show temperature, wind, or "Bristol, RI".
- Waterline is fixed at `WATER_SURFACE_Y` / `WATER_BOTTOM_Y` (the authored seawall, dock, and berth). Do not animate tide, fetch NOAA, or add `?tide=`.

## Do not

- Copy or salvage a custom canvas loop (including PR 15 `src/harbor/**`).
- Draw sprites with Pillow/Canvas/Graphics and bake them as the look.
- Put game HUD in React.
- Smooth/antialias pixels.
- Import Phaser at the top of a Worker-evaluated file.
