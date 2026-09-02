#!/usr/bin/env python3
"""Build Cut and beam print materials from Adam's boat drawing.

Source of truth for the boat remains public/boat.jpeg via public/boat.png
(scripts/punch-boat.py). This script does not replace that drawing. It
hardens it into a woodcut and draws the lighthouse cut, the beam, the
water, grain, and the derived icons this look uses.

    python3 scripts/cut-and-beam.py
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC_BOAT = PUBLIC / "boat.png"

INK = (0, 0, 0)
PAPER = (255, 255, 255)

# ViewBox for the print. CSS boat placement must match these numbers.
VB_W = 1600
VB_H = 1000
BOAT_X = 740
BOAT_Y = 318
BOAT_W = 780

# Lantern slit at the top of the wedge, then the beam opens down-right.
BEAM = [(214, 0), (272, 0), (1600, 548), (1600, 1000), (812, 1000)]
LANTERN = (243, 8)


def harden_boat(src: Image.Image) -> Image.Image:
    """Keep the drawn boat. Recolor to hard black and thicken the cut."""
    rgba = src.convert("RGBA")
    alpha = rgba.split()[-1]
    hard = alpha.point(lambda value: 255 if value > 68 else 0)
    thick = hard.filter(ImageFilter.MaxFilter(3))
    cut = Image.new("RGBA", rgba.size, (*INK, 0))
    cut.putalpha(thick)
    bbox = cut.getbbox()
    if bbox is None:
        raise SystemExit("boat punch produced an empty image")
    left, top, right, bottom = bbox
    pad = 12
    return cut.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(cut.width, right + pad),
            min(cut.height, bottom + pad),
        )
    )


def wood_grain(*, width: int, height: int, seed: int = 25) -> Image.Image:
    """Directional woodblock tooth. Black marks on transparent."""
    rng = np.random.default_rng(seed)
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    x = np.linspace(0.0, 1.0, width, dtype=np.float32)[None, :]
    wander = np.sin(y * 17.0 * math.pi + 0.45 * np.sin(y * 6.5 * math.pi))
    bands = np.sin((x * 190.0 + wander * 7.0) * math.pi)
    noise = rng.normal(0.0, 0.32, (height, width)).astype(np.float32)
    speckle = rng.random((height, width)) > 0.994
    chatter = np.abs(bands + 0.55 * noise)
    alpha = np.clip((chatter - 0.72) * 160.0, 0.0, 78.0)
    alpha = np.where(speckle, np.maximum(alpha, 64.0), alpha)
    alpha = np.round(alpha / 16.0) * 16.0
    grain = Image.new("RGBA", (width, height), (*INK, 0))
    grain.putalpha(Image.fromarray(alpha.astype(np.uint8), mode="L"))
    return grain


def fmt_points(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def beam_hatches() -> str:
    lines: list[str] = []
    far_left = (1600.0, 548.0)
    far_right = (812.0, 1000.0)
    count = 9
    for index in range(count):
        t = (index + 0.5) / count
        x = far_left[0] + (far_right[0] - far_left[0]) * t
        y = far_left[1] + (far_right[1] - far_left[1]) * t
        width = 0.7 if index in {2, 5, 7} else 0.45
        lines.append(
            f'    <line x1="{LANTERN[0]}" y1="{LANTERN[1]}" x2="{x:.1f}" y2="{y:.1f}" '
            f'stroke="#000" stroke-width="{width}" />'
        )
    return "\n".join(lines)


def seigaiha_patch() -> str:
    paths: list[str] = []
    radius = 34.0
    for row in range(5):
        for col in range(4):
            cx = 48.0 + col * radius + (radius * 0.5 if row % 2 else 0.0)
            cy = 708.0 + row * radius * 0.52
            paths.append(
                f'    <path d="M {cx - radius:.1f},{cy:.1f} '
                f'A {radius:.1f} {radius:.1f} 0 0 1 {cx + radius:.1f},{cy:.1f}" />'
            )
    return "\n".join(paths)


def write_print_svg(path: Path) -> None:
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB_W} {VB_H}" width="{VB_W}" height="{VB_H}" fill="none">
  <title>Lighthouse cut over empty water</title>
  <rect width="{VB_W}" height="{VB_H}" fill="#000"/>
  <polygon id="beam" points="{fmt_points(BEAM)}" fill="#fff"/>
  <g id="lantern-cut" fill="#000">
    <rect x="214" y="0" width="58" height="20" fill="#fff"/>
    <rect x="214" y="5" width="58" height="2.4"/>
    <rect x="214" y="11" width="58" height="2.4"/>
    <rect x="214" y="17" width="58" height="2.4"/>
  </g>
  <g id="beam-hatch">
{beam_hatches()}
  </g>
  <g id="water" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path stroke-width="1.1" d="M 0,392 H 188"/>
    <path stroke-width="0.8" d="M 24,418 H 156"/>
    <path stroke-width="2.2" d="M -30,612 C 70,574 150,656 268,618 C 372,586 458,668 596,632 C 680,612 748,666 812,650"/>
    <path stroke-width="1.6" d="M -20,704 C 86,668 164,748 292,710 C 400,678 486,758 620,724 C 700,704 760,748 812,738"/>
    <path stroke-width="2.4" d="M -40,838 C 80,792 168,896 310,848 C 430,808 520,912 670,868 C 748,844 790,888 812,880"/>
    <path stroke-width="1.3" d="M 12,548 C 92,528 148,572 230,552 C 310,534 368,578 448,560"/>
    <path stroke-width="1.1" d="M 40,960 C 140,936 220,988 340,962 C 460,936 540,990 680,968"/>
  </g>
  <g id="foam" fill="#fff">
    <path d="M 262,614 q 14,-26 32,-8 q 10,16 -12,18 q -10,-20 -20,-10 z"/>
    <path d="M 588,628 q 12,-20 26,-6 q 8,12 -10,14 q -8,-16 -16,-8 z"/>
    <path d="M 304,706 q 16,-28 34,-9 q 11,18 -13,20 q -11,-22 -21,-11 z"/>
    <path d="M 304,844 q 18,-32 40,-10 q 12,20 -14,22 q -12,-24 -26,-12 z"/>
    <path d="M 664,864 q 13,-22 28,-7 q 9,14 -11,16 q -9,-18 -17,-9 z"/>
  </g>
  <g id="seigaiha" stroke="#fff" stroke-width="0.9" fill="none">
{seigaiha_patch()}
  </g>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def raster_print(boat: Image.Image, grain: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (VB_W, VB_H), INK)
    draw = ImageDraw.Draw(canvas)
    draw.polygon(BEAM, fill=PAPER)
    draw.rectangle((214, 0, 272, 20), fill=PAPER)
    draw.rectangle((214, 5, 272, 7.4), fill=INK)
    draw.rectangle((214, 11, 272, 13.4), fill=INK)
    draw.rectangle((214, 17, 272, 19.4), fill=INK)
    far_left = (1600.0, 548.0)
    far_right = (812.0, 1000.0)
    for index in range(9):
        t = (index + 0.5) / 9
        x = far_left[0] + (far_right[0] - far_left[0]) * t
        y = far_left[1] + (far_right[1] - far_left[1]) * t
        draw.line((LANTERN, (x, y)), fill=INK, width=1)
    fitted = boat.copy()
    fitted.thumbnail((BOAT_W, int(BOAT_W * boat.height / boat.width)), Image.Resampling.LANCZOS)
    canvas.paste(fitted, (BOAT_X, BOAT_Y), fitted)
    canvas.paste(INK, (0, 0), grain)
    return canvas


def caption_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ):
        path = Path(name)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def write_og(print_rgb: Image.Image, path_png: Path, path_jpg: Path) -> None:
    og_w, og_h = 1200, 630
    scaled = print_rgb.resize((1920, 1200), Image.Resampling.LANCZOS)
    left = (scaled.width - og_w) // 2 + 80
    top = (scaled.height - og_h) // 2 + 40
    og = scaled.crop((left, top, left + og_w, top + og_h))
    draw = ImageDraw.Draw(og)
    font = caption_font(18)
    draw.text((48, og_h - 72), "Adam Bailey", font=font, fill=PAPER)
    draw.text((48, og_h - 48), "fresh New England software", font=font, fill=PAPER)
    og.convert("P", palette=Image.Palette.ADAPTIVE, colors=24).save(
        path_png, "PNG", optimize=True, compress_level=9
    )
    og.save(path_jpg, "JPEG", quality=88, optimize=True, progressive=True)


def square_mark(boat: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), INK)
    w, h = boat.size
    mark = boat.crop((int(w * 0.28), 0, int(w * 0.62), int(h * 0.55)))
    fitted = ImageOps.contain(mark, (int(size * 0.86), int(size * 0.86)))
    paper = Image.new("RGBA", fitted.size, (*PAPER, 0))
    paper.paste(fitted, mask=fitted.split()[-1])
    x = (size - paper.width) // 2
    y = (size - paper.height) // 2
    canvas.paste(paper.convert("RGB"), (x, y), paper)
    return canvas


def write_wake(boat: Image.Image, path: Path) -> None:
    w, h = boat.size
    wake = boat.crop((int(w * 0.04), int(h * 0.78), int(w * 0.96), h))
    inverted = Image.new("RGBA", wake.size, (*PAPER, 0))
    inverted.putalpha(wake.split()[-1])
    inverted.save(path, "PNG", optimize=True)


def main() -> None:
    if not SRC_BOAT.exists():
        raise SystemExit(f"missing {SRC_BOAT}; run scripts/punch-boat.py first")

    boat = harden_boat(Image.open(SRC_BOAT))
    boat_path = PUBLIC / "boat-cut.png"
    boat.save(boat_path, "PNG", optimize=True)

    grain = wood_grain(width=800, height=500)
    grain_full = grain.resize((VB_W, VB_H), Image.Resampling.BILINEAR)
    grain_path = PUBLIC / "print-grain.png"
    grain.save(grain_path, "PNG", optimize=True)

    svg_path = PUBLIC / "cut-and-beam.svg"
    write_print_svg(svg_path)

    print_rgb = raster_print(boat, grain_full)
    write_og(print_rgb, PUBLIC / "og.png", PUBLIC / "og.jpg")
    write_wake(boat, PUBLIC / "wake.png")

    icons: dict[int, Image.Image] = {}
    for size, name in (
        (16, "favicon-16.png"),
        (32, "favicon-32.png"),
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
    ):
        icon = square_mark(boat, size)
        icon.save(PUBLIC / name, "PNG", optimize=True)
        icons[size] = icon
    icons[32].save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])

    print(f"wrote {boat_path} {boat.size[0]}x{boat.size[1]}")
    print(f"wrote {svg_path}")
    print(f"wrote {grain_path}")
    print("wrote og, wake, favicons")
    print(
        "boat css: "
        f"left {BOAT_X / VB_W * 100:.3f}% "
        f"top {BOAT_Y / VB_H * 100:.3f}% "
        f"width {BOAT_W / VB_W * 100:.3f}%"
    )


if __name__ == "__main__":
    main()
