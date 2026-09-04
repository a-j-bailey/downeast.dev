# Harbor studio pass

Playtest of production `https://downeast.dev` plus this branch. Scope is Adam’s locked list (1–14). Flag ripple (#28) and spawn (#27) are on `main` and were not retouched.

## Ranked issues (player-visible)

1. HTML `downeast.dev` Fraunces title sitting on the sky / clouds (reads as a webpage, not a diorama).
2. Soft / non-integer CSS scale on tall phones — mushy pixels.
3. Ink HUD clock on navy / dusk (unreadable).
4. `?weather=night` still lerped from daytime Light2D ambient — muddy “not-night.”
5. Water drawn *over* far-shore land and cottages.
6. 3–5px water band in the seawall ↔ dirt join.
7. Gray Light2D underpaint rectangles behind shacks / cafe.
8. Boat clamped to a ~38px slip (`BOAT_OPEN_MIN_X = 60` … dock `x = 98`) — cannot leave the berth.
9. Hull facing used `flipX = vx < 0` on **left-facing** art; underway texture was a different size so nav lights drifted after the first turn.
10. Ferry behind water + Light2D = dark blob; no useful night cabin.
11. Tide ±5px too subtle.
12. Postcard chrome crowding the view; Keep walking is a dashed stamp, easy to miss.
13. Stick missing on narrow landscape phones; interact chip hit box tight.
14. Shark fin art faces left; flip assumed right-facing, so it swam backwards.

## Shipped this pass

| # | Fix |
| --- | --- |
| 1 | Wordmark is visually hidden (sr-only `h1` kept). Pixel sky is clear. |
| 2 | Integer CSS zoom (`view × zoom`). Tall: nearest zoom that still fills (~90%+). Never stretch the framebuffer. `image-rendering: pixelated`. |
| 3 | Cream HUD clock when sky luminance is low, plus night / rain / fog / `isDark`. |
| 4 | Forced night uses a fixed navy sky + dark ambient (`0x0a0e16` / `0x243044`). Windows and lamps stay accents. |
| 5 | Tide half-range 12px (24px high vs low). |
| 6 | Ferry in front of water, unlit + cream tint, follows the live tide line, stronger cabin glow at night. |
| 7 | More postcard margin; Keep walking is a solid ink chip with cream type. |
| 8 | Stick on touch / coarse / width ≤720 / tall / `?stick=1`. Larger tappable chip zone. |
| 9 | Opaque unlit land backing + planks overlapping the seawall; shore foam no longer paints a water band through the seam. |
| 10 | Water bands origin-top at the surface; far shore / cottages / lighthouse depth **above** water. |
| 11 | Gray underpaint rectangles removed. Building sprites were already opaque; plates were the slop. |
| 12 | Facing from helm (`wish.x > 0` ⇒ flipX). Lights recomputed every boat frame at stem / flagpole tip. Hull stays `boat.png` (underway sheet is a different size and was desyncing fixtures). |
| 13 | Open water to `WORLD_MIN_X = -720`. Board → left into the bay; right still stops at the berth. |
| 14 | Shark `flipX` when swimming **right** (art faces left). |

## Playtest notes

- Spawn between flagpole and shack-a is already on `main` (#27).
- Flag limp / half / full-out is already on `main` (#28) — left alone.
- Mute / ambient bed is still PR 22; not pulled.
- Nav: unflipped hull faces left; bow red facing left, green facing right; white stern on the flagpole tip.

## Remaining backlog

- `boat-underway.png` is still loaded but unused (size mismatch with `boat.png`). Re-slice to 171×51 or drop from `STREAM_IMAGES`.
- Lighthouse sprite has interior transparent window holes (intentional glass); not filled.
- Postcard ingest script still references deleted `pier.png` — will fail if re-run.
- `SCROLL.foreground` unused.
- `weather.ambientColor` / `loadWeatherMood` dead.
- Cafe interior integer-scales (1× in 480×270) with sky/letterbox; a 2× sheet would fill more of the view.
- Water shimmer is 1px-stepped; could use a dedicated POT wave cycle instead of swapping unequal `waves-0/1/2` frames.
