# Harbor studio pass

Playtest of production `https://downeast.dev` plus this branch. Scope is Adam’s locked list (1–14) plus follow-ups (facades, scale framing, seawall terminus, pixel snap). Flag ripple (#28) and spawn (#27) are on `main` and were not retouched.

## Ranked issues (player-visible)

1. HTML `downeast.dev` Fraunces title sitting on the sky / clouds (reads as a webpage, not a diorama).
2. Soft / non-integer CSS scale on tall phones — mushy pixels. (Integer-zoom crop later made the world *larger* than production.)
3. Ink HUD clock on navy / dusk (unreadable).
4. `?weather=night` still lerped from daytime Light2D ambient — muddy “not-night.”
5. Water drawn *over* far-shore land and cottages.
6. 3–5px water band in the seawall ↔ dirt join.
7. Gray Light2D underpaint rectangles behind shacks / cafe; cafe roof lace (sky/rain through shakes).
8. Boat clamped to a ~38px slip (`BOAT_OPEN_MIN_X = 60` … dock `x = 98`) — cannot leave the berth.
9. Hull facing used `flipX = vx < 0` on **left-facing** art; underway texture was a different size so nav lights drifted after the first turn.
10. Ferry behind water + Light2D = dark blob; no useful night cabin.
11. Tide ±5px too subtle.
12. Postcard chrome crowding the view; Keep walking is a dashed stamp, easy to miss.
13. Stick missing on narrow landscape phones; interact chip hit box tight.
14. Shark fin art faces left; flip assumed right-facing, so it swam backwards.
15. Dark plank street continued into open water past the seawall.
16. Subpixel camera/sprite floats shimmered props while walking.

## Shipped this pass

| # | Fix |
| --- | --- |
| 1 | Wordmark is visually hidden (sr-only `h1` kept). Pixel sky is clear. |
| 2 | Tall phones match production framing: `viewW = 270 × parentAspect` (≥200), canvas **fills parent**. Landscape FIT letterbox. `image-rendering: pixelated`. No integer-zoom crop. |
| 3 | Cream HUD clock when sky luminance is low, plus night / rain / fog / `isDark`. Clock inset `viewW-10`. |
| 4 | Forced night uses a fixed navy sky + dark ambient (`0x0a0e16` / `0x243044`). Windows and lamps stay accents. |
| 5 | Tide half-range 12px (24px high vs low). |
| 6 | Ferry in the visible lane (`48`…`WORLD_WIDTH-48`), in front of water, unlit + cream tint, cabin glow at night. |
| 7 | More postcard margin; Keep walking is a solid ink chip with cream type. Force delay 400ms. |
| 8 | Stick on touch / coarse / width ≤720 / tall / `?stick=1`. Larger tappable chip zone. |
| 9 | Opaque unlit land backing + planks overlapping the seawall; shore foam no longer paints a water band through the seam. |
| 10 | Water bands origin-top at the surface; far shore / cottages / lighthouse depth **above** water. |
| 11 | Gray underpaint gone. Cafe / shacks re-ingested from `village-buildings.png` (`scripts/process-harbor-buildings.py`: edge-cream flood, close shake gaps, no lace-y block reduce). Land buildings unlit so Light2D doesn’t punch sky through dark shakes. |
| 12 | Facing from helm (`wish.x > 0` ⇒ flipX). Lights recomputed every boat frame at stem / flagpole tip. Hull stays `boat.png`. |
| 13 | Open water to `WORLD_MIN_X = -720`. Board → left into the bay; right still stops at the berth. |
| 14 | Shark `flipX` when swimming **right** (art faces left). |
| 15 | Road-stone + dark planks start at `SEAWALL_LEFT_X`. Dock+boat sit seaward (`dock.x=36`, `boat.x=44`). Walker path on the light dock. |
| 16 | `roundPixels` on game + cameras. Snap scroll/sprites on Scene `prerender` (after follow). Parallax layers use integer `home + scroll*(1-sf)`. |
| 17 | Wake sprite off the stern while the hull has speed; hidden at berth. |
| 18 | Boarded player is visible in the cockpit (scaled, flipped with facing). |
| 19 | Virtual stick lower-left and ~17% smaller; chip does not sit on it. |
| 20 | Berth camera looks seaward 18px so a 200-wide phone shows water past the bow. |

## Playtest notes

- Spawn between flagpole and shack-a is already on `main` (#27).
- Flag limp / half / full-out is already on `main` (#28) — left alone.
- Mute / ambient bed is still PR 22; not pulled.
- Nav: unflipped hull faces left; bow red facing left, green facing right; white stern on the flagpole tip.
- Phone check: `390×844` → view `200×270` filled to parent (same as production main). Docked boat stays in frame.
- Berth: dock `x=36`, boat `x=44` (was 96/98). Seawall still at 166. Light dock is behind the walker. Whole 171px hull fits a 200-wide phone view with water past the bow.
- Wake: `wake.png` off the stern while underway; hidden when stopped/berthed.
- Boarded walker sits in the cockpit at 0.5 scale (navy sweater), hidden lantern; restored on disembark.
- Stick: radius 30 (~17% smaller than 36), lower-left (`viewH-10`, `x = radius+10`) so it sits over water instead of the cabin. Interact chip stays bottom-center (shifts right of the stick on a 200-wide phone).
- `?berth=1` stands on the light dock. `?boat=1` boards at the berth.


## Remaining backlog

- `boat-underway.png` is still loaded but unused (size mismatch with `boat.png`). Re-slice to 171×51 or drop from `STREAM_IMAGES`.
- Lighthouse sprite has interior transparent window holes (intentional glass); not filled.
- Postcard ingest script still references deleted `pier.png` — will fail if re-run.
- `SCROLL.foreground` unused.
- `weather.ambientColor` / `loadWeatherMood` dead.
- Cafe interior integer-scales (1× in 480×270) with sky/letterbox; a 2× sheet would fill more of the view.
- Water shimmer is 1px-stepped; could use a dedicated POT wave cycle instead of swapping unequal `waves-0/1/2` frames.
