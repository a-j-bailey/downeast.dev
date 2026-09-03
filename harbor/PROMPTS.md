# Image-gen prompts

Use these when generating a new facade, interior, or prop so it matches the world already in the repo. Ask for a **side-view (orthographic) pixel-art sprite**, transparent or paper `#FFFCF0` background, **no labels, no watermark, no mockup chrome**, hard pixels, no smoothing.

After generation: crop, knock out the background, integer-scale, save under `public/harbor/` with a real name. If the sheet is messy, keep it as `public/harbor/ref/` and redraw clean frames (see `scripts/harbor-sprites.py`).

## Shared look

```
Side-view pixel art, theatrical diorama, 16px tile scale, hard pixels, no anti-aliasing.
Coastal Maine harbor. Palette: paper #FFFCF0, ink #100F0F, navy hull #1A2744, cream #F0E6C8, teak #8B5A3C, water #1F5478, cedar shake #8A8680, granite #7A7A72, brick #A33B32, teal door #2A6F6A.
Orthographic profile, not 3/4 Stardew perspective, not isometric.
```

## Key art / composition (reference only — do not paste as the world)

```
Side-view Maine harbor diorama, top 55% sky and distant water, bottom 45% village street.
Left: Hinckley picnic boat (navy hull, cream cabin, varnished windshield) tied to a wooden pier.
Granite seawall, two cedar-shake shacks, one coffee shop with hanging coffee-cup sign, lobster traps, two wooden trail signposts labeled GITHUB and X.
Distant low green/rocky shore. Paper sky, a few gray pixel clouds.
```

## Village facades

```
Sprite sheet, side-view, well spaced on paper or transparent:
- small gray cedar-shake shack, peaked roof, red door, one window
- small gray cedar-shake shack, teal or green door, lobster buoy on the wall
- larger coffee shop, cedar shake, dark shingles, red brick chimney, teal door, storefront window with a coffee cup, hanging wooden coffee-cup sign, planter with orange flowers
- two wooden trail signposts: GITHUB arrow, X plank
- granite seawall segments (straight, with stairs)
- wooden lobster traps, stacked and single
No text labels on the sheet besides the in-world GITHUB / X / COFFEE signs.
```

## Player

```
Side-view pixel character, visitor, not a specific person.
Navy sweater, olive pants, brown boots, dark brown hair.
Sprite sheet rows: idle facing right; 4-frame walk right; 4-frame walk left; use/interact right (arm out).
Transparent background, consistent 18x32 box per frame, no row labels.
```

## Cafe interior (LOCKED — do not restyle)

```
Side-view pixel-art coffee shop interior, diorama box with dark wood frame.
Horizontal teak floor planks. Left wall tan brick with navy wainscoting. Back wall red brick.
Navy service counter with espresso machine, mugs, pastry case. Chalkboard menu. Warm pendant light.
Two small wood tables with navy chairs and a white-flower vase. Navy rug with a tan anchor.
Left: wood door with glass pane. Right: multi-pane window looking out at a bright harbor.
Framed monochrome boat drawing on the left wall. Potted plants. Cozy, warm, not cartoony.
```

## Boat underway

```
Hinckley-style picnic boat, side profile facing left, navy hull, cream cabin, teak windshield, red waterline.
White/light-blue wake along the hull and a V-spray at the transom.
Transparent or paper background. Also provide the boat without water for docking.
```

## Kayak, lighthouse, shark, waves

```
Transparent sprite sheet, side-view:
- blue sit-on-top kayak and a double paddle
- shark fin with a little foam; full great-white-style shark facing left (dark gray over white belly)
- rocky islet with a white lighthouse, black lantern room, small red-roof cottage, pines, white fence
- three tileable horizontal wave strips (calm, chop, deep)
- white V-shaped boat wake
No hex labels, no captions.
```

## Weather overlays

```
Pixel weather on transparent or black:
- short diagonal rain streaks in teal #24837B and blue #205EA6
- low dithered fog banks, paper white
- tiny stars and a few 4-point stars
- mustard sun disc #AD8301, paper moon disc with craters
No typographic labels.
```
