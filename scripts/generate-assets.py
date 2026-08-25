#!/usr/bin/env python3
"""Rasterize the boat drawing and derive favicon, apple-touch, OG, and wake assets."""

from __future__ import annotations

import re
import urllib.request
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
# Flexoki light: paper and black. https://stephango.com/flexoki
PAPER = (255, 252, 240)  # #FFFCF0
INK = (16, 15, 15)  # #100F0F


def ensure_fraunces() -> Path:
    dest = Path("/tmp/fonts/fraunces.ttf")
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    css_url = (
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@144,500&display=swap"
    )
    req = urllib.request.Request(css_url, headers={"User-Agent": "Mozilla/5.0"})
    css = urllib.request.urlopen(req).read().decode()
    match = re.search(r"https://fonts.gstatic.com/[^)]+", css)
    if not match:
        raise RuntimeError("Could not find Fraunces file in Google Fonts CSS")
    urllib.request.urlretrieve(match.group(0), dest)
    return dest


def svg_to_rgba(path: Path, width: int) -> Image.Image:
    png = cairosvg.svg2png(url=str(path), output_width=width)
    return Image.open(BytesIO(png)).convert("RGBA")


def onto_paper(src: Image.Image, paper: tuple[int, int, int] = PAPER) -> Image.Image:
    bg = Image.new("RGB", src.size, paper)
    bg.paste(src, mask=src.split()[-1])
    return bg


def save_jpeg(img: Image.Image, dest: Path, quality: int = 92) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)


def crop_content(img: Image.Image, pad: int = 24) -> Image.Image:
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox is None:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def square_pad(src: Image.Image, size: int, paper: tuple[int, int, int] = PAPER) -> Image.Image:
    canvas = Image.new("RGB", (size, size), paper)
    fitted = src.copy()
    fitted.thumbnail((int(size * 0.82), int(size * 0.82)), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    return canvas


def main() -> None:
    svg = PUBLIC / "boat.svg"
    full = svg_to_rgba(svg, width=2400)

    # Transparent ink for the hero (paper comes from CSS --bg).
    ink_only = crop_content(full, pad=48)
    ink_only.save(PUBLIC / "boat.png", "PNG", optimize=True)
    save_jpeg(onto_paper(ink_only), PUBLIC / "boat.jpeg", quality=93)

    # Cabin / radar / antenna mark - still the same line work.
    scale = full.width / 1600
    mark_box = (
        int(490 * scale),
        int(8 * scale),
        int(940 * scale),
        int(360 * scale),
    )
    mark = full.crop(mark_box)
    mark_rgb = onto_paper(mark)

    icons: dict[int, Image.Image] = {}
    for size, name in (
        (16, "favicon-16.png"),
        (32, "favicon-32.png"),
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
    ):
        icon = square_pad(mark_rgb, size)
        icon.save(PUBLIC / name, "PNG", optimize=True)
        icons[size] = icon
    icons[32].save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])

    # Open Graph: drawing on paper with the wordmark.
    og_w, og_h = 1200, 630
    og = Image.new("RGB", (og_w, og_h), PAPER)
    drawing = onto_paper(crop_content(full, pad=20))
    drawing.thumbnail((1080, 430), Image.Resampling.LANCZOS)
    og.paste(drawing, ((og_w - drawing.width) // 2, 58))

    font = ImageFont.truetype(str(ensure_fraunces()), 54)
    draw = ImageDraw.Draw(og)
    text = "downeast.dev"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (og_w - tw) // 2
    ty = og_h - th - 72
    draw.text((tx, ty), text, font=font, fill=INK)
    og.save(PUBLIC / "og.png", "PNG", optimize=True)
    save_jpeg(og, PUBLIC / "og.jpg", quality=90)

    # Wake-only graphic for 404, cropped from the same strokes.
    wake_box = (
        int(180 * scale),
        int(480 * scale),
        int(1520 * scale),
        int(575 * scale),
    )
    wake = full.crop(wake_box)
    onto_paper(wake).save(PUBLIC / "wake.png", "PNG", optimize=True)

    print("wrote assets to", PUBLIC)


if __name__ == "__main__":
    main()
