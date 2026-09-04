"""Ingest flagpole + flag frames: cream flood-fill, erode, bleed, block-reduce.

Unlike process-harbor-art.py this keys only the *background* cream (flood from
the sheet edges) so flag stripe whites that sit near #fefaf0 are kept.
"""
from PIL import Image
import numpy as np
from scipy import ndimage
from collections import Counter, deque
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET_DIR = os.path.join(ROOT, "public/harbor/source/sheets")
DST = os.path.join(ROOT, "public/harbor/processed")
os.makedirs(DST, exist_ok=True)

CREAM = np.array([254, 250, 240])

FLAG_BOXES = [
    (268, 360, 410, 610),
    (520, 360, 790, 590),
    (840, 350, 1140, 580),
    (1170, 340, 1490, 580),
]


def flood_bg(a, fuzz=22):
    h, w, _ = a.shape
    rgb = a[:, :, :3].astype(int)
    near = np.abs(rgb - CREAM).max(axis=2) <= fuzz
    vis = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if near[0, x]:
            q.append((0, x))
        if near[h - 1, x]:
            q.append((h - 1, x))
    for y in range(h):
        if near[y, 0]:
            q.append((y, 0))
        if near[y, w - 1]:
            q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if vis[y, x]:
            continue
        vis[y, x] = True
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not vis[ny, nx] and near[ny, nx]:
                q.append((ny, nx))
    return vis


def erode_alpha(a, px=1):
    alpha = a[:, :, 3] > 128
    eroded = ndimage.binary_erosion(alpha, structure=np.ones((px * 2 + 1, px * 2 + 1)))
    out = a.copy()
    out[~eroded, 3] = 0
    return out


def bleed(a):
    out = a.copy()
    opaque = a[:, :, 3] > 128
    if not opaque.any() or opaque.all():
        return out
    inv = ~opaque
    _, (iy, ix) = ndimage.distance_transform_edt(inv, return_indices=True)
    out[:, :, 0] = np.where(inv, a[iy, ix, 0], a[:, :, 0])
    out[:, :, 1] = np.where(inv, a[iy, ix, 1], a[:, :, 1])
    out[:, :, 2] = np.where(inv, a[iy, ix, 2], a[:, :, 2])
    return out


def block_reduce(a, f):
    h, w, _ = a.shape
    H, W = h // f, w // f
    a = a[: H * f, : W * f]
    out = np.zeros((H, W, 4), dtype=np.uint8)
    for y in range(H):
        for x in range(W):
            blk = a[y * f : (y + 1) * f, x * f : (x + 1) * f].reshape(-1, 4)
            opaque = blk[blk[:, 3] > 128]
            if len(opaque) < max(2, (f * f) // 4):
                if len(blk):
                    c = Counter(map(tuple, blk[:, :3])).most_common(1)[0][0]
                    out[y, x] = np.array([*c, 0], dtype=np.uint8)
                continue
            c = Counter(map(tuple, opaque)).most_common(1)[0][0]
            out[y, x] = np.array(c, dtype=np.uint8)
    return out


def keyed(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).copy()
    bg = flood_bg(a)
    a[bg, 3] = 0
    return a


def proc(a, f):
    a = erode_alpha(a, 1)
    a = bleed(a)
    small = block_reduce(a, f)
    small = bleed(small)
    bb = Image.fromarray(small, "RGBA").getbbox()
    if bb:
        small = small[bb[1] : bb[3], bb[0] : bb[2]]
    return Image.fromarray(small, "RGBA")


def main():
    pole_path = os.path.join(SHEET_DIR, "flagpole.png")
    sheet_path = os.path.join(SHEET_DIR, "flag-flagpole.png")
    pole = keyed(pole_path)
    ys, xs = np.where(pole[:, :, 3] > 128)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    pw = x1 - x0
    y1b = min(y1, y0 + pw * 8)
    pad = 6
    crop = pole[max(0, y0 - pad) : y1b + pad, max(0, x0 - pad) : x1 + pad]
    pole_im = proc(crop, 8)
    pole_im.save(os.path.join(DST, "flagpole.png"))
    print(f"  flagpole.png {pole_im.size[0]}x{pole_im.size[1]}")

    sheet = keyed(sheet_path)
    flags = []
    for i, (bx0, by0, bx1, by1) in enumerate(FLAG_BOXES):
        sl = sheet[by0:by1, bx0:bx1]
        ys, xs = np.where(sl[:, :, 3] > 128)
        pad = 6
        c = sl[
            max(0, ys.min() - pad) : ys.max() + 1 + pad,
            max(0, xs.min() - pad) : xs.max() + 1 + pad,
        ]
        flags.append(proc(c, 8))

    W = max(im.size[0] for im in flags)
    H = max(im.size[1] for im in flags)
    for i, im in enumerate(flags):
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        canvas.paste(im, (0, 0), im)
        a = bleed(np.asarray(canvas))
        out = Image.fromarray(a, "RGBA")
        name = f"flag-{i}.png"
        out.save(os.path.join(DST, name))
        print(f"  {name} {out.size[0]}x{out.size[1]}")
    print("done")


if __name__ == "__main__":
    main()
