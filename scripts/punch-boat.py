#!/usr/bin/env python3
"""Knock white paper out of Adam's scanned boat drawing.

Source of truth: public/boat.jpeg (ink on paper). Writes public/boat.png.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "boat.jpeg"
DEST = ROOT / "public" / "boat.png"

# Flexoki black. https://stephango.com/flexoki
INK = (0x10, 0x0F, 0x0F)
PAPER_LUMA = 248
PAD = 48


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


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    out = punch(Image.open(SRC).convert("RGB"))
    out.save(DEST, "PNG", optimize=True)
    print(f"wrote {DEST} {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()
