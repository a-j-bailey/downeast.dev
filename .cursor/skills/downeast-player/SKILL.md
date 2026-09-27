---
name: downeast-player
description: Calm Canvas2D harbor player on downeast.dev. Living pixel village plus generative Web Audio lofi — not a walkable game.
---

# Downeast player

The homepage is a **calm media player**. Album art is a living 480×270 pixel New England fishing village ("East Passage"). There is no Phaser, no React game, no joystick, no interiors.

## Architecture

Vanilla Vite ES modules:

- `src/engine/core.js` — 480×270, 240 s loop, `wave` / `step` / `cycle` / `scroll`
- `src/engine/display.js` — integer-preferring nearest-neighbor present; portrait crops around `focusX`
- `src/scene/east-passage.js` — hand-authored Canvas2D painter
- `src/audio/*` — Web Audio generative lofi + harbor ambience (no samples, no Tone.js)
- `src/app.js` — dock UI, idle fade, keyboard, `/projects` overlay

## Scene

Logical buffer is **480×270**. Paint with `fillRect` / ImageData / prerendered canvases. `imageSmoothingEnabled = false`. Animation must be a function of `t % 240` so the loop seals.

Do not bring back Phaser, sprite sheets as the look, WASD, possession, or a game HUD.

A tiny dock walker is scene decoration only — not a player character.

## Audio

`createPlayer()` must not construct an AudioContext. `unlock()` runs inside a click / key / tap. Play pulses until then.

Volumes are `v²` on the faders. Ambience skips the tape chain. Persist volumes, vibe, and mixer trims in `localStorage` under `downeast:`.

## UI

Thin bottom dock. Fades after idle (~3.5 s) and **H** hides it. Flexoki dark + warm lamp accent. Large play / mute on coarse pointers.

## Content

`src/content/projects.js` and `thoughts.js` feed overlays and the About sheet. Do not invent marketing copy. Keep "Adam Bailey. fresh New England software".
