# Harbor art bible

Side-view theatrical diorama. Not a 3/4 farm map. The walkable street is a single ground line. Sky and far water take the top ~55% of the viewport so the name can sit in the DOM.

## Rendering

- Native sprite size is ~16px tiles (player ~18×32, buildings 50–100px wide).
- Integer zoom only. Letterbox, never stretch.
- `image-rendering: pixelated`. Canvas `imageSmoothingEnabled = false`. Round draw positions to integers.
- Do not ship one flattened background as the world. Layers: `src/harbor/layers.ts`.

## Palette

Flexoki is optional. These are the coastal pixels in the current sprites:

| Token | Hex | Use |
| --- | --- | --- |
| paper | `#FFFCF0` | Day sky, UI sheet |
| ink | `#100F0F` | Night sky, outlines, type |
| navy | `#1A2744` | Hull, sweater, cafe counter |
| cream | `#F0E6C8` | Cabin, trim |
| teak | `#8B5A3C` | Wood, pier, windshield |
| water | `#1F5478` | Harbor water |
| water-deep | `#163A58` | Open ocean |
| shake | `#8A8680` | Cedar siding |
| granite | `#7A7A72` | Seawall |
| brick | `#A33B32` | Cafe chimney / interior brick |
| tan-brick | `#C4A574` | Cafe left wall |
| door | `#2A6F6A` | Teal doors |
| dusk | `#BC5215` | Sunset wash |
| sun | `#AD8301` | Sun disc, lantern |
| olive | `#5C6B32` | Pants, pines |

Keep name and tagline readable on the sky: ink on day paper, paper on night ink, ink on dusk (the wash is light enough at the top).

## Locked looks

**Cafe interior is locked.** Adam signed off on this room. Same layout, palette, counter, window, framed boat painting. Do not restyle, regenerate, or swap in a different interior.

- Canonical file: `harbor/locked/coffee-interior.png`
- Game loads: `public/harbor/coffee-interior.png` (a copy; `scripts/harbor-sprites.py` recopies the locked file and will not redraw it)
- Runtime only: blit `public/boat.png` into the existing frame rect in `INTERIORS.coffee.painting`

Slice or crop only if the bitmap is larger than the 320×180 room. Do not paint over the counter, window, brick, or furniture.

## How to add a building

1. Draw a side-view facade PNG (transparent, integer size) into `public/harbor/`.
2. Add a `BuildingDef` in `src/harbor/world.ts`.
3. If it is enterable: draw an interior room the size of the view (`320×180`), add an `InteriorDef`, set `interiorId`. Door on the interior must be a rect the player can walk to.
4. If it is not ready: `interiorId: null` and a short `closedPrompt`. Shacks stay closed until they have interiors.
5. Fade is already in the game loop. Do not invent a modal card for rooms.

Outdoor facade + interior room + door interact + fade. That is the whole pattern.

## Actors

- **Player** — visitor in a navy sweater. Not a portrait of Adam. Sheet: idle / walk×4 / use, facing right; the game mirrors left.
- **Picnic boat** — vehicle. Board from the pier (`E`). Wake while moving (`wake.png`). Dock to walk again.
- **Kayak** — scenery on the shore. Not a vehicle unless someone adds a `VehicleDef`.
- **Shark** — ambient in deep water (fin, sometimes a full pass). Not combat.

## Files

| Path | What |
| --- | --- |
| `src/harbor/layers.ts` | Layer names + parallax |
| `src/harbor/world.ts` | Buildings, interiors, signs, vehicles |
| `src/harbor/palette.ts` | Hex used by the renderer |
| `scripts/harbor-sprites.py` | Regenerates game-ready PNGs |
| `public/harbor/*.png` | Sprites the game loads |
| `harbor/PROMPTS.md` | Image-gen templates for new art |
| `.cursor/skills/harbor-world/SKILL.md` | Agent recipe |

Regenerate sprites:

```sh
python3 scripts/harbor-sprites.py
```
