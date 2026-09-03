---
name: harbor-world
description: use this when adding harbor scenes, buildings, interiors, sprites, or weather to downeast.dev
---

# Harbor world

downeast.dev’s homepage is a **side-view** Canvas 2D harbor, not Phaser, not a 3/4 map. Read `harbor/ART.md` and `src/harbor/layers.ts` before drawing or coding.

## Files

| Path | Role |
| --- | --- |
| `src/harbor/layers.ts` | Layer names + parallax (source of truth) |
| `src/harbor/world.ts` | Data: buildings, interiors, signs, vehicles, walk bounds |
| `src/harbor/game.ts` | Loop, camera, enter/exit, boat |
| `src/harbor/render.ts` | Draws `LAYER_ORDER` back to front |
| `src/harbor/weather.ts` | Open-Meteo Bristol RI, fail-open |
| `src/harbor/Harbor.tsx` | React shell, DOM title, links, prompt |
| `scripts/harbor-sprites.py` | Regenerates `public/harbor/*.png` |
| `harbor/ART.md` | Art bible |
| `harbor/PROMPTS.md` | Image-gen templates |

Do not add a second homepage layout. Do not flatten layers into one background PNG.

## Layer stack

Back to front, from `LAYERS` in `src/harbor/layers.ts`:

1. **sky** — parallax `0.12`. Fill, sun/moon/stars, clouds.
2. **far** — `0.34`. Distant shore, lighthouse islet.
3. **water** — `0.58`. Animated tiled waves. Ocean extends left of the pier.
4. **land** — `1`. Seawall, street, facades, pier deck.
5. **actors** — `1`. Player, boat, kayak, shark.
6. **fg** — `1`, higher z. Signposts and props in front of the walk line.

Camera follows the player (or the boat). Integer pixels. Weather (rain, fog, dusk wash) draws after `fg`.

## Add an enterable building

1. Facade PNG in `public/harbor/` (transparent, integer size).
2. Interior PNG, **320×180**, door on the walk line. Cafe interior is **locked** — do not restyle `coffee-interior.png`.
3. `BuildingDef` in `world.ts` with `interiorId` set.
4. Matching `InteriorDef`: `spawnX`, `door` rect, optional `painting` rect for `public/boat.png`.
5. Walk to the door, `E` / tap. `game.ts` already fades, switches `place`, and Esc/door leaves.

Closed buildings: `interiorId: null` + `closedPrompt`. Do not route them through a modal. Shacks stay closed until they have interiors.

Interactables are derived from `world.ts` (`interactablesFor`). Do not special-case a new door inside the update loop.

## Add a vehicle

1. Hull sprite (and optional underway/wake).
2. `VehicleDef` in `world.ts`: `dockX`, `disembarkX`, `minX`/`maxX`, `boardW`.
3. `kind: "board"` / `"dock"` come from `interactablesFor`. Walk mode boards; boat mode steers with left/right, throttle up/down to leave the harbor into open ocean, `E` near the pier to dock.
4. Kayak is scenery until it has a `VehicleDef`. Shark is ambient, not a vehicle.

## Art constraints

- Side-view only. Integer scale, no smoothing.
- Palette and locked cafe look: `harbor/ART.md`.
- Prompts for new sprites: `harbor/PROMPTS.md`.
- Player is a visitor in a navy sweater, not Adam.
- Original boat drawing stays a painting in the cafe (`public/boat.png`), not the hero.

```sh
python3 scripts/harbor-sprites.py
npm run build
```

## Weather

`src/harbor/weather.ts` — Open-Meteo, Bristol ~41.677, -71.266. Do not block first paint. In-memory cache, 15 minutes. Fail open to `America/New_York` time and a clear sky.
