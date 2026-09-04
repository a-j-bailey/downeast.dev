"""Re-ingest village buildings from the source sheet with opaque silhouettes.

Edge-floods cream (so window cream/trim stay), closes shake gaps at source
resolution, then block-reduces. Does not generate art.
"""
from PIL import Image
import numpy as np
from scipy import ndimage
from collections import Counter, deque
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "public/harbor/source/sheets/village-buildings.png")
DST = os.path.join(ROOT, "public/harbor/processed")
os.makedirs(DST, exist_ok=True)

CREAM = np.array([254, 250, 240])
REDUCE = 4
CLOSE = 9

# y0, y1, x0, x1 on the 1536×1024 sheet (PIL row/col).
CROPS = {
    "shack-a.png": (135, 502, 29, 335),
    "shack-b.png": (158, 502, 375, 688),
    "coffee-shop.png": (103, 507, 727, 1196),
}


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


def close_silhouette(a, radius):
    op = a[:, :, 3] > 128
    struct = np.ones((radius, radius))
    closed = ndimage.binary_closing(op, structure=struct)
    out = bleed(a)
    new = closed & ~op
    out[new, 3] = 255
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
            if len(opaque) == 0:
                if len(blk):
                    c = Counter(map(tuple, blk[:, :3])).most_common(1)[0][0]
                    out[y, x] = np.array([*c, 0], dtype=np.uint8)
                continue
            c = Counter(map(tuple, opaque[:, :3])).most_common(1)[0][0]
            out[y, x] = np.array([*c, 255], dtype=np.uint8)
    return out


def crop_bbox(a):
    ys, xs = np.where(a[:, :, 3] > 128)
    if len(xs) == 0:
        return a
    return a[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def harden_processed(path, radius=3):
    """Fill leftover lace on an already-sliced sprite (far cottages)."""
    im = Image.open(path).convert("RGBA")
    a = close_silhouette(np.asarray(im).copy(), radius)
    Image.fromarray(a, "RGBA").save(path, "PNG")
    print(f"  hardened {os.path.basename(path)} {im.size[0]}x{im.size[1]}")


def main():
    sheet = np.asarray(Image.open(SHEET).convert("RGBA"))
    for name, (y0, y1, x0, x1) in CROPS.items():
        crop = sheet[y0:y1, x0:x1].copy()
        bg = flood_bg(crop)
        crop[bg, 3] = 0
        crop = close_silhouette(crop, CLOSE)
        small = block_reduce(crop, REDUCE)
        small = bleed(small)
        small = close_silhouette(small, 3)
        small = crop_bbox(small)
        out = Image.fromarray(small, "RGBA")
        dest = os.path.join(DST, name)
        out.save(dest, "PNG")
        print(f"  {name} {out.size[0]}x{out.size[1]}")

    for name in ("far-cottage-a.png", "far-cottage-b.png"):
        path = os.path.join(DST, name)
        if os.path.exists(path):
            harden_processed(path, 3)
    print("done")


if __name__ == "__main__":
    main()
