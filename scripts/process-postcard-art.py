"""Ingest postcard sheets: hard-pixel reduce. Do not cream-key the harbor photo."""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/harbor/source/sheets"
DST = ROOT / "public/harbor/processed"

CREAM = np.array([254, 250, 240], dtype=np.int16)


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


def main() -> None:
    harbor = np.asarray(Image.open(SRC / "postcard-harbor.png").convert("RGBA"))
    save("postcard-harbor.png", block_reduce(harbor, 8))

    stamp = np.asarray(Image.open(SRC / "postcard-stamp.png").convert("RGBA"))
    stamp = flood_knockout(stamp)
    stamp = block_reduce(stamp, 16)
    stamp = crop_opaque(stamp)
    save("postcard-stamp.png", stamp)


if __name__ == "__main__":
    main()
