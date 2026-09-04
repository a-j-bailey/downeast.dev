"""Postcard ingest.

Harbor souvenir is composed from existing processed sprites (hard pixels),
then stored as the runtime PNG plus a 4× nearest source sheet. Do not
majority-vote a painterly sheet — that is what made the first card mushy.

Stamp still comes from the generated sheet (cream-knockout + block reduce).
Do not cream-key the harbor photo; the sky must stay.
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/harbor/source/sheets"
DST = ROOT / "public/harbor/processed"
SPRITES = DST

CREAM = np.array([254, 250, 240], dtype=np.int16)

# 16:9 SNES-ish postcard. Integer 0.5 display is 192×108 on the HUD.
HARBOR_W = 384
HARBOR_H = 216
HORIZON = 96
LAND_Y = 164
SOURCE_W = 1536
SOURCE_H = 1024

# Flexoki-adjacent dusk, hard bands (not a soft gradient).
SKY_BANDS = [
    (42, 74, 110),
    (61, 109, 154),
    (91, 147, 197),
    (126, 168, 196),
    (184, 160, 112),
    (224, 177, 90),
    (218, 112, 44),
]


def load_sprite(name: str) -> np.ndarray:
    return np.asarray(Image.open(SPRITES / name).convert("RGBA"))


def blit(dst: np.ndarray, src: np.ndarray, x: int, y: int) -> None:
    sh, sw = src.shape[:2]
    dh, dw = dst.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(dw, x + sw), min(dh, y + sh)
    if x1 <= x0 or y1 <= y0:
        return
    chunk = src[y0 - y : y1 - y, x0 - x : x1 - x]
    region = dst[y0:y1, x0:x1]
    alpha = chunk[:, :, 3:4].astype(np.float32) / 255.0
    region[:, :, :3] = (chunk[:, :, :3].astype(np.float32) * alpha + region[:, :, :3].astype(np.float32) * (1.0 - alpha)).astype(
        np.uint8
    )
    region[:, :, 3] = np.maximum(region[:, :, 3], chunk[:, :, 3])


def fill_tile(dst: np.ndarray, src: np.ndarray, x: int, y: int, w: int, h: int) -> None:
    sh, sw = src.shape[:2]
    if sh <= 0 or sw <= 0 or w <= 0 or h <= 0:
        return
    for oy in range(0, h, sh):
        ch = min(sh, h - oy)
        for ox in range(0, w, sw):
            cw = min(sw, w - ox)
            blit(dst, src[:ch, :cw], x + ox, y + oy)


def paint_sky(dst: np.ndarray) -> None:
    band = HORIZON // len(SKY_BANDS)
    for i, color in enumerate(SKY_BANDS):
        y0 = i * band
        y1 = HORIZON if i == len(SKY_BANDS) - 1 else (i + 1) * band
        dst[y0:y1, :] = (*color, 255)


def compose_harbor() -> np.ndarray:
    dst = np.zeros((HARBOR_H, HARBOR_W, 4), dtype=np.uint8)
    dst[:, :, 3] = 255
    paint_sky(dst)

    water_deep = load_sprite("water-deep.png")
    water = load_sprite("water.png")
    foam = load_sprite("waves-foam.png")
    far_shore = load_sprite("far-shore.png")
    road = load_sprite("road-stone.png")
    planks = load_sprite("wharf-planks.png")
    seawall = load_sprite("seawall.png")
    lighthouse = load_sprite("lighthouse.png")
    shack_a = load_sprite("shack-a.png")
    shack_b = load_sprite("shack-b.png")
    coffee = load_sprite("coffee-shop.png")
    dock = load_sprite("dock.png")
    pier = load_sprite("pier.png")
    boat = load_sprite("boat.png")
    traps = load_sprite("trap-stack.png")
    sun = load_sprite("sun.png")
    cloud = load_sprite("cloud.png")

    fill_tile(dst, far_shore, 0, HORIZON - far_shore.shape[0], HARBOR_W, far_shore.shape[0])
    fill_tile(dst, water_deep, 0, HORIZON, HARBOR_W, LAND_Y - HORIZON)
    fill_tile(dst, water, 0, HORIZON, HARBOR_W, water.shape[0])
    fill_tile(dst, foam, 0, HORIZON, HARBOR_W, foam.shape[0])
    fill_tile(dst, road, 0, LAND_Y, HARBOR_W, HARBOR_H - LAND_Y)
    fill_tile(dst, planks, 0, LAND_Y, HARBOR_W, 28)

    wall_y = LAND_Y - 16
    wall_w = seawall.shape[1]
    x = 120
    while x < HARBOR_W:
        blit(dst, seawall, x, wall_y)
        x += wall_w - 1

    blit(dst, lighthouse, 236, HORIZON - lighthouse.shape[0] + 22)
    blit(dst, shack_a, 142, LAND_Y - shack_a.shape[0] + 4)
    blit(dst, coffee, 208, LAND_Y - coffee.shape[0] + 4)
    blit(dst, shack_b, 304, LAND_Y - shack_b.shape[0] + 4)
    blit(dst, traps, 132, LAND_Y - traps.shape[0] + 6)

    blit(dst, dock, 12, LAND_Y - 8)
    blit(dst, pier, 2, LAND_Y - 4)
    blit(dst, boat, 6, HARBOR_H - boat.shape[0] - 2)

    blit(dst, sun, 36, HORIZON - 22)
    blit(dst, cloud, 88, 14)
    blit(dst, cloud, 248, 22)
    return dst


def block_reduce(a: np.ndarray, factor: int) -> np.ndarray:
    h, w, _ = a.shape
    out_h, out_w = h // factor, w // factor
    a = a[: out_h * factor, : out_w * factor]
    out = np.zeros((out_h, out_w, 4), dtype=np.uint8)
    for y in range(out_h):
        for x in range(out_w):
            blk = a[y * factor : (y + 1) * factor, x * factor : (x + 1) * factor].reshape(-1, 4)
            opaque = blk[blk[:, 3] > 128]
            if len(opaque) < max(2, (factor * factor) // 4):
                continue
            packed = (
                opaque[:, 0].astype(np.int32) << 16
                | opaque[:, 1].astype(np.int32) << 8
                | opaque[:, 2].astype(np.int32)
            )
            vals, counts = np.unique(packed, return_counts=True)
            key = int(vals[counts.argmax()])
            out[y, x] = [(key >> 16) & 255, (key >> 8) & 255, key & 255, 255]
    return out


def flood_knockout(a: np.ndarray, fuzz: int = 22) -> np.ndarray:
    """Punch near-cream reachable from the corners (sheet background only)."""
    h, w, _ = a.shape
    rgb = a[:, :, :3].astype(np.int16)
    near = np.abs(rgb - CREAM).max(axis=2) <= fuzz
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for y, x in ((0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)):
        if near[y, x]:
            q.append((y, x))
            seen[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    out = a.copy()
    out[seen, 3] = 0
    return out


def crop_opaque(a: np.ndarray) -> np.ndarray:
    ys, xs = np.where(a[:, :, 3] > 128)
    if len(ys) == 0:
        return a
    return a[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def save(name: str, a: np.ndarray) -> None:
    DST.mkdir(parents=True, exist_ok=True)
    Image.fromarray(a, "RGBA").save(DST / name, "PNG")
    print(f"  {name} {a.shape[1]}x{a.shape[0]}")


def write_source_sheet(harbor: np.ndarray) -> None:
    """4× nearest of the compose, padded to the 1536×1024 sheet size."""
    SRC.mkdir(parents=True, exist_ok=True)
    scaled = Image.fromarray(harbor, "RGBA").resize((HARBOR_W * 4, HARBOR_H * 4), Image.Resampling.NEAREST)
    sheet = Image.new("RGBA", (SOURCE_W, SOURCE_H), (254, 250, 240, 255))
    sheet.paste(scaled, (0, 0))
    sheet.save(SRC / "postcard-harbor.png", "PNG")
    print(f"  source/sheets/postcard-harbor.png {sheet.size[0]}x{sheet.size[1]}")


def main() -> None:
    harbor = compose_harbor()
    save("postcard-harbor.png", harbor)
    write_source_sheet(harbor)

    stamp = np.asarray(Image.open(SRC / "postcard-stamp.png").convert("RGBA"))
    stamp = flood_knockout(stamp)
    stamp = block_reduce(stamp, 16)
    stamp = crop_opaque(stamp)
    save("postcard-stamp.png", stamp)


if __name__ == "__main__":
    main()
