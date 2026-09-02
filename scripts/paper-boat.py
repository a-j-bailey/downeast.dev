#!/usr/bin/env python3
"""Recolor the punched boat drawing to Flexoki paper for dark washes.

Reads public/boat.png and writes public/boat-paper.png.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "boat.png"
DEST = ROOT / "public" / "boat-paper.png"
PAPER = (0xFF, 0xFC, 0xF0)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    ink = Image.open(SRC).convert("RGBA")
    _, _, _, alpha = ink.split()
    paper = Image.new("RGB", ink.size, PAPER)
    Image.merge("RGBA", (*paper.split(), alpha)).save(DEST, "PNG", optimize=True)
    print(f"wrote {DEST} {ink.size[0]}x{ink.size[1]}")


if __name__ == "__main__":
    main()
