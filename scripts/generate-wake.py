#!/usr/bin/env python3
"""Kelvin V-wake geometry and punched ink for the Underway homepage.

Writes:
  public/underway-wake.svg   vector arms + chevrons (Flexoki ink)
  public/underway-wake.png   punched ink drawing, if a source scan is present
  src/wake/geometry.ts       apex, stern, viewBox, and path data

The homepage draws these assets. It does not fake a wake with CSS triangles.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC_INK = PUBLIC / "underway-wake-ink.png"
DEST_PNG = PUBLIC / "underway-wake.png"
DEST_SVG = PUBLIC / "underway-wake.svg"
DEST_TS = ROOT / "src" / "wake" / "geometry.ts"

INK = (0x10, 0x0F, 0x0F)
INK_HEX = "#100f0f"
PAPER_LUMA = 248
PAD = 24

# Kelvin half-angle. Arms trail the heading at ±arcsin(1/3).
KELVIN_HALF = math.asin(1 / 3)

# Boat PNG stern, fractions of the displayed drawing.
BOAT_STERN_X = 0.12
BOAT_STERN_Y = 0.70

VIEW_W = 1200
VIEW_H = 640
# Apex sits on the right. Heading is +x, so the wake runs -x.
APEX_X = 1088.0
APEX_Y = 318.0
ARM_LEN = 1040.0


def luma_to_alpha(value: int) -> int:
    if value > PAPER_LUMA:
        return 0
    return min(255, round((PAPER_LUMA - value) * 255 / PAPER_LUMA))


def punch(src: Image.Image) -> Image.Image:
    gray = src.convert("L")
    alpha = gray.point(luma_to_alpha)
    rgba = Image.new("RGBA", src.size, (*INK, 0))
    rgba.putalpha(alpha)
    bbox = rgba.getbbox()
    if bbox is None:
        return rgba
    left, top, right, bottom = bbox
    left = max(0, left - PAD)
    top = max(0, top - PAD)
    right = min(rgba.width, right + PAD)
    bottom = min(rgba.height, bottom + PAD)
    return rgba.crop((left, top, right, bottom))


def apex_of(png: Image.Image) -> tuple[float, float]:
    """Rightmost ink near mid-height. That is the V point."""
    alpha = png.split()[-1]
    w, h = png.size
    y0, y1 = int(h * 0.35), int(h * 0.65)
    best_x = 0
    best_y = h / 2
    for y in range(y0, y1):
        row = alpha.crop((0, y, w, y + 1))
        pix = list(row.get_flattened_data())
        for x in range(w - 1, -1, -1):
            if pix[x] > 40:
                if x > best_x:
                    best_x = x
                    best_y = y
                break
    return best_x / w, best_y / h


def jittered(rng: random.Random, along: float, amp: float) -> float:
    return (rng.random() * 2 - 1) * amp * (0.35 + 0.65 * along)


def arm_path(
    rng: random.Random,
    *,
    sign: float,
    length: float,
    serration: float,
    steps: int,
) -> str:
    heading = math.pi  # left, opposite the boat
    angle = heading + sign * KELVIN_HALF
    dx = math.cos(angle)
    dy = math.sin(angle)
    px = -dy
    py = dx
    parts = [f"M {APEX_X:.2f} {APEX_Y:.2f}"]
    for i in range(1, steps + 1):
        t = i / steps
        dist = length * t
        # Serrations grow as the arm leaves the transom.
        bump = serration * (0.25 + 0.75 * t)
        side = bump if i % 2 else -bump * 0.45
        side += jittered(rng, t, serration * 0.35)
        x = APEX_X + dx * dist + px * side
        y = APEX_Y + dy * dist + py * side
        parts.append(f"L {x:.2f} {y:.2f}")
    return " ".join(parts)


def chevron_path(rng: random.Random, *, dist: float, scale: float) -> str:
    heading = math.pi
    up = heading - KELVIN_HALF
    down = heading + KELVIN_HALF
    point_x = APEX_X + math.cos(heading) * dist + jittered(rng, 0.5, 3.0)
    point_y = APEX_Y + jittered(rng, 0.5, 2.5)
    chord = (64 + dist * 0.2) * scale
    x1 = point_x + math.cos(up) * chord
    y1 = point_y + math.sin(up) * chord
    x2 = point_x + math.cos(down) * chord
    y2 = point_y + math.sin(down) * chord
    return (
        f"M {point_x:.2f} {point_y:.2f} L {x1:.2f} {y1:.2f} "
        f"M {point_x:.2f} {point_y:.2f} L {x2:.2f} {y2:.2f}"
    )


def tick_path(rng: random.Random, *, dist: float, sign: float) -> str:
    heading = math.pi
    angle = heading + sign * KELVIN_HALF * 0.55
    cx = APEX_X + math.cos(heading) * dist
    cy = APEX_Y + math.sin(heading) * dist
    length = 18 + rng.random() * 16
    x2 = cx + math.cos(angle) * length
    y2 = cy + math.sin(angle) * length
    return f"M {cx:.2f} {cy:.2f} L {x2:.2f} {y2:.2f}"


def build_paths() -> tuple[list[str], list[str], list[str]]:
    rng = random.Random(3801)
    arms = [
        arm_path(rng, sign=-1, length=ARM_LEN, serration=9.5, steps=56),
        arm_path(rng, sign=1, length=ARM_LEN, serration=9.5, steps=56),
        arm_path(rng, sign=-1, length=ARM_LEN * 0.92, serration=4.2, steps=40),
        arm_path(rng, sign=1, length=ARM_LEN * 0.92, serration=4.2, steps=40),
    ]
    chevrons = [
        chevron_path(rng, dist=d, scale=s)
        for d, s in (
            (90, 0.7),
            (170, 0.82),
            (270, 0.9),
            (390, 1.0),
            (530, 1.05),
            (690, 1.08),
            (860, 1.1),
        )
    ]
    ticks = [
        tick_path(rng, dist=d, sign=s)
        for d, s in (
            (130, -1),
            (150, 1),
            (220, -1),
            (250, 1),
            (340, -1),
            (410, 1),
            (480, -1),
            (560, 1),
            (640, -1),
            (760, 1),
        )
    ]
    return arms, chevrons, ticks


def svg_escape(d: str) -> str:
    return d


def write_svg(arms: list[str], chevrons: list[str], ticks: list[str]) -> None:
    arm_nodes = "\n".join(
        f'    <path class="arm" d="{svg_escape(d)}" />' for d in arms
    )
    chevron_nodes = "\n".join(
        f'    <path class="chevron" d="{svg_escape(d)}" />' for d in chevrons
    )
    tick_nodes = "\n".join(
        f'    <path class="tick" d="{svg_escape(d)}" />' for d in ticks
    )
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" fill="none" aria-hidden="true">
  <title>Kelvin V-wake</title>
  <g stroke="{INK_HEX}" stroke-linecap="round" stroke-linejoin="round">
    <g class="arms" stroke-width="1.35">
{arm_nodes}
    </g>
    <g class="chevrons" stroke-width="1.05">
{chevron_nodes}
    </g>
    <g class="ticks" stroke-width="0.9">
{tick_nodes}
    </g>
  </g>
</svg>
"""
    DEST_SVG.write_text(svg, encoding="utf-8")


def ts_string(d: str) -> str:
    return d.replace("\\", "\\\\").replace('"', '\\"')


def write_ts(
    arms: list[str],
    chevrons: list[str],
    ticks: list[str],
    png_apex: tuple[float, float] | None,
    png_size: tuple[int, int] | None,
) -> None:
    apex_x, apex_y = png_apex if png_apex else (APEX_X / VIEW_W, APEX_Y / VIEW_H)
    png_w, png_h = png_size if png_size else (VIEW_W, VIEW_H)

    def entries(kind: str, paths: list[str]) -> str:
        lines = []
        for d in paths:
            lines.append(f'  {{ kind: "{kind}", d: "{ts_string(d)}" }},')
        return "\n".join(lines)

    DEST_TS.parent.mkdir(parents=True, exist_ok=True)
    DEST_TS.write_text(
        f"""/** Kelvin V-wake geometry for the Underway homepage.

Generated by scripts/generate-wake.py. Do not edit by hand.
*/

export const KELVIN_HALF_RAD = {KELVIN_HALF:.10f};

export const WAKE_VIEWBOX = {{
  width: {VIEW_W},
  height: {VIEW_H},
}} as const;

/** Apex of the SVG wake, in viewBox units. */
export const WAKE_SVG_APEX = {{
  x: {APEX_X},
  y: {APEX_Y},
}} as const;

/** Apex of public/underway-wake.png, as fractions of its pixel size. */
export const WAKE_PNG_APEX = {{
  x: {apex_x:.6f},
  y: {apex_y:.6f},
}} as const;

export const WAKE_PNG_SIZE = {{
  width: {png_w},
  height: {png_h},
}} as const;

/** Stern of public/boat.png, as fractions of the displayed drawing. */
export const BOAT_STERN = {{
  x: {BOAT_STERN_X},
  y: {BOAT_STERN_Y},
}} as const;

export type WakePathKind = "arm" | "chevron" | "tick";

export type WakePath = {{
  kind: WakePathKind;
  d: string;
}};

export const WAKE_PATHS: readonly WakePath[] = [
{entries("arm", arms)}
{entries("chevron", chevrons)}
{entries("tick", ticks)}
];
""",
        encoding="utf-8",
    )


def punch_ink() -> tuple[tuple[float, float], tuple[int, int]] | None:
    if not SRC_INK.exists():
        print(f"no {SRC_INK}, skipping PNG punch")
        return None
    punched = punch(Image.open(SRC_INK).convert("RGB"))
    punched.save(DEST_PNG, "PNG", optimize=True)
    apex = apex_of(punched)
    print(f"wrote {DEST_PNG} {punched.size[0]}x{punched.size[1]} apex={apex}")
    return apex, punched.size


def main() -> None:
    arms, chevrons, ticks = build_paths()
    write_svg(arms, chevrons, ticks)
    print(f"wrote {DEST_SVG}")
    png = punch_ink()
    if png is None:
        write_ts(arms, chevrons, ticks, None, None)
    else:
        write_ts(arms, chevrons, ticks, png[0], png[1])
    print(f"wrote {DEST_TS}")


if __name__ == "__main__":
    main()
