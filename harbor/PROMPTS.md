# Harbor art prompts

Art for this game is **generated as pixel sheets**, then sliced into `public/harbor/processed/`. It is never drawn in Phaser Graphics, Canvas 2D, or Pillow and baked as the look.

`public/harbor/source/sheets/` is the source of truth for those sheets (1536×1024). Phaser loads only the processed slices.

## When you need a new sprite

1. Generate a new sheet (same 8-bit, limited palette, cream or black knockout, no anti-alias, no halo).
2. Save the raw sheet under `public/harbor/source/sheets/`.
3. Slice game-scale frames and run `scripts/process-harbor-art.py` (ingest: cream key, 1px erode, alpha-bleed).
4. Commit the processed PNG. Load it with `this.load.image(key, '/harbor/processed/key.png')`.

Do not invent replacement art in code while "waiting" for a sheet.

## Constraints that belong in every prompt

- 8-bit pixel art, nearest-neighbor, no anti-alias, no drop shadow, no white fringe.
- Side view. Characters and boats right-facing unless the sheet says otherwise.
- Player frames on a shared 25×43 canvas, bottom-aligned.
- Cream `#fefaf0` or solid black as the knockout; processing keys cream.
- Water tiles must be power-of-two (64×32) if they will `TileSprite`.
- Interior: one locked scene (`cafe-interior.png`). Do not restyle it.
- Buildings include a thin ground strip so they sit on the seawall line.

## Existing sheets

| file | contents |
|---|---|
| `player-walk.png` | Idle, walk cycle, use |
| `picnic-boat-pier.png` | Boat, pier |
| `boat-underway.png` | Underway boat + wake |
| `village-buildings.png` | Shacks, cafe, signs |
| `kayak-lighthouse-shark-waves.png` | Kayak, lighthouse, shark, waves |
| `harbor-key-art.png` | Key / contact sheet |

If a processed slice already exists, use it. Do not regenerate to "match a vibe."
