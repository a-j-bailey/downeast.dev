#!/usr/bin/env python3
"""Harbor sprite pipeline (read-only).

Source-of-truth art lives in:
  - public/harbor/source/sheets/*.png   (raw 1536x1024 sheets)
  - public/harbor/source/sliced/*.png   (pre-sliced at full resolution)

The game itself loads the downscaled, approved sprites from:
  - public/harbor/*.png

This script never hand-draws or procedurally paints any sprite pixels. It only
reads images to verify that required PNGs exist and are non-empty.
"""

from __future__ import annotations

from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_HARBOR = ROOT / "public" / "harbor"
SOURCE_SHEETS = PUBLIC_HARBOR / "source" / "sheets"
SOURCE_SLICED = PUBLIC_HARBOR / "source" / "sliced"
LOCKED_CAFE = ROOT / "harbor" / "locked" / "coffee-interior.png"


REQUIRED = [
    "boat.png",
    "boat-underway.png",
    "wake.png",
    "pier.png",
    "seawall.png",
    "seawall-stairs.png",
    "shack-a.png",
    "shack-b.png",
    "coffee-shop.png",
    "sign-github.png",
    "sign-x.png",
    "trap.png",
    "trap-stack.png",
    "trap-buoy.png",
    "player-idle.png",
    "player-walk-0.png",
    "player-walk-1.png",
    "player-walk-2.png",
    "player-walk-3.png",
    "player-use.png",
    "lighthouse.png",
    "far-shore.png",
    "cloud.png",
    "kayak.png",
    "paddle.png",
    "shark.png",
    "shark-fin.png",
    "waves-0.png",
    "waves-1.png",
    "waves-2.png",
    "coffee-interior.png",
]

SOURCE_SLICED_REQUIRED = [name for name in REQUIRED if name != "coffee-interior.png"]
SOURCE_SHEETS_REQUIRED = [
    "harbor-key-art.png",
    "village-buildings.png",
    "picnic-boat-pier.png",
    "boat-underway.png",
    "player-walk.png",
    "kayak-lighthouse-shark-waves.png",
]


def verify_png(path: Path) -> tuple[int, int]:
    if not path.is_file():
        raise FileNotFoundError(str(path))
    if path.stat().st_size < 8:
        raise RuntimeError(f"{path} is suspiciously small")
    with Image.open(path) as im:
        w, h = im.size
        if w <= 0 or h <= 0:
            raise RuntimeError(f"{path} has invalid size {w}x{h}")
        return w, h


def main() -> None:
    missing_game: list[str] = []
    for name in REQUIRED:
        if not (PUBLIC_HARBOR / name).is_file():
            missing_game.append(name)

    if not LOCKED_CAFE.is_file():
        raise FileNotFoundError(str(LOCKED_CAFE))

    if not SOURCE_SHEETS.is_dir():
        raise FileNotFoundError(str(SOURCE_SHEETS))
    if not SOURCE_SLICED.is_dir():
        raise FileNotFoundError(str(SOURCE_SLICED))

    missing_sliced: list[str] = []
    for name in SOURCE_SLICED_REQUIRED:
        if not (SOURCE_SLICED / name).is_file():
            missing_sliced.append(name)

    missing_sheets: list[str] = []
    for name in SOURCE_SHEETS_REQUIRED:
        if not (SOURCE_SHEETS / name).is_file():
            missing_sheets.append(name)

    if missing_game or missing_sliced or missing_sheets:
        if missing_game:
            print("Missing game-ready sprites in public/harbor/:")
            for m in missing_game:
                print(" -", m)
        if missing_sliced:
            print("Missing full-resolution slices in public/harbor/source/sliced/:")
            for m in missing_sliced:
                print(" -", m)
        if missing_sheets:
            print("Missing raw sheets in public/harbor/source/sheets/:")
            for m in missing_sheets:
                print(" -", m)
        sys.exit(1)

    print("Harbor sprite verification:")
    for name in REQUIRED:
        w, h = verify_png(PUBLIC_HARBOR / name)
        print(f"  {name} {w}x{h}")

    # Light sanity checks on source sheet dimensions.
    for name in SOURCE_SHEETS_REQUIRED:
        w, h = verify_png(SOURCE_SHEETS / name)
        if (w, h) != (1536, 1024):
            raise RuntimeError(f"{name} expected 1536x1024 but is {w}x{h}")


if __name__ == "__main__":
    main()

