#!/usr/bin/env python3
"""Derive favicon, apple-touch, OG, and wake from public/boat.png.

Does not read or write SVG. Does not overwrite public/boat.jpeg.
"""

from __future__ import annotations

import re
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
# Flexoki light. https://stephango.com/flexoki
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


def onto_paper(src: Image.Image, paper: tuple[int, int, int] = PAPER) -> Image.Image:
    bg = Image.new("RGB", src.size, paper)
    bg.paste(src, mask=src.split()[-1] if src.mode == "RGBA" else None)
    return bg


def square_pad(src: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), PAPER)
    fitted = src.copy()
    fitted.thumbnail((int(size * 0.82), int(size * 0.82)), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    return canvas


def main() -> None:
    boat = Image.open(PUBLIC / "boat.png").convert("RGBA")
    w, h = boat.size

    # Cabin, radar, and antenna — same pixels as the hero PNG.
    mark = boat.crop((int(w * 0.28), 0, int(w * 0.62), int(h * 0.55)))
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

    og_w, og_h = 1200, 630
    og = Image.new("RGB", (og_w, og_h), PAPER)
    drawing = onto_paper(boat)
    drawing.thumbnail((1080, 430), Image.Resampling.LANCZOS)
    og.paste(drawing, ((og_w - drawing.width) // 2, 58))

    font = ImageFont.truetype(str(ensure_fraunces()), 54)
    draw = ImageDraw.Draw(og)
    text = "downeast.dev"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((og_w - tw) // 2, og_h - th - 72), text, font=font, fill=INK)
    og.save(PUBLIC / "og.png", "PNG", optimize=True)
    og.save(PUBLIC / "og.jpg", "JPEG", quality=90, optimize=True, progressive=True)

    wake = boat.crop((int(w * 0.04), int(h * 0.78), int(w * 0.96), h))
    onto_paper(wake).save(PUBLIC / "wake.png", "PNG", optimize=True)

    print("derived assets from", PUBLIC / "boat.png", f"{w}x{h}")


if __name__ == "__main__":
    main()
