"""Ingest flagpole + limp / half / full flag sheets.

Stripe whites sit near cream #fefaf0, so sheets are masked from red/blue cloth
(then closed) instead of flooding every cream pixel. Flagpole still uses an
edge flood so the gold ball and shaft keep interior highlights.
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
REDUCE = 8
EXPECTED_FRAMES = 3

FLAG_SHEETS = [
    ("flag-limp.png", "flag-limp"),
    ("flag-half.png", "flag-half"),
    ("flag-full.png", "flag-full"),
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


def cloth_mask(a):
    """Keep red/blue cloth and the white stripes trapped between them."""
    rgb = a[:, :, :3].astype(int)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    red = (r > 120) & (r > g + 40) & (r > b + 40)
    blue = (b > 70) & (b >= r - 10) & (b > g) & (r < 110)
    core = red | blue
    closed = ndimage.binary_closing(core, structure=np.ones((21, 9)))
    closed = ndimage.binary_dilation(closed, structure=np.ones((7, 7)))
    return closed


def column_boxes(mask, expected=EXPECTED_FRAMES, min_area=2000):
    labeled, n = ndimage.label(mask)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        if len(ys) < min_area:
            continue
        comps.append(
            {
                "x0": int(xs.min()),
                "x1": int(xs.max()) + 1,
                "y0": int(ys.min()),
                "y1": int(ys.max()) + 1,
                "cx": float(xs.mean()),
            }
        )
    if not comps:
        return []
    comps.sort(key=lambda c: c["cx"])
    x_min = comps[0]["cx"]
    x_max = comps[-1]["cx"]
    if expected <= 1 or x_max - x_min < 40:
        clusters = [comps]
    else:
        span = x_max - x_min
        centers = [x_min + (i + 0.5) * span / expected for i in range(expected)]
        clusters = [[] for _ in range(expected)]
        for c in comps:
            j = min(range(expected), key=lambda k: abs(c["cx"] - centers[k]))
            clusters[j].append(c)
    boxes = []
    for cl in clusters:
        if not cl:
            continue
        boxes.append(
            (
                min(c["x0"] for c in cl),
                min(c["y0"] for c in cl),
                max(c["x1"] for c in cl),
                max(c["y1"] for c in cl),
            )
        )
    boxes.sort(key=lambda b: b[0])
    return boxes


def process_flag_sheet(filename, prefix):
    path = os.path.join(SHEET_DIR, filename)
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).copy()
    mask = cloth_mask(a)
    boxes = column_boxes(mask)
    if len(boxes) != EXPECTED_FRAMES:
        raise SystemExit(f"{filename}: expected {EXPECTED_FRAMES} flags, got {len(boxes)}")
    frames = []
    pad = 8
    h, w = mask.shape
    for x0, y0, x1, y1 in boxes:
        sx0, sy0 = max(0, x0 - pad), max(0, y0 - pad)
        sx1, sy1 = min(w, x1 + pad), min(h, y1 + pad)
        sl = a[sy0:sy1, sx0:sx1].copy()
        m = mask[sy0:sy1, sx0:sx1]
        sl[~m, 3] = 0
        frames.append(proc(sl, REDUCE))
    max_w = max(im.size[0] for im in frames)
    max_h = max(im.size[1] for im in frames)
    for i, im in enumerate(frames):
        canvas = Image.new("RGBA", (max_w, max_h), (0, 0, 0, 0))
        canvas.paste(im, (0, 0), im)
        out = Image.fromarray(bleed(np.asarray(canvas)), "RGBA")
        name = f"{prefix}-{i}.png"
        out.save(os.path.join(DST, name))
        print(f"  {name} {out.size[0]}x{out.size[1]}")


def process_flagpole():
    pole = keyed(os.path.join(SHEET_DIR, "flagpole.png"))
    ys, xs = np.where(pole[:, :, 3] > 128)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    pw = x1 - x0
    # ~12× width at game scale so the pole reads above shack-a’s roof.
    y1b = min(y1, y0 + pw * 12)
    pad = 6
    crop = pole[max(0, y0 - pad) : y1b + pad, max(0, x0 - pad) : x1 + pad]
    pole_im = proc(crop, REDUCE)
    pole_im.save(os.path.join(DST, "flagpole.png"))
    print(f"  flagpole.png {pole_im.size[0]}x{pole_im.size[1]}")


def main():
    process_flagpole()
    for filename, prefix in FLAG_SHEETS:
        process_flag_sheet(filename, prefix)
    for stale in ("flag-0.png", "flag-1.png", "flag-2.png", "flag-3.png"):
        path = os.path.join(DST, stale)
        if os.path.exists(path):
            os.remove(path)
            print(f"  removed {stale}")
    print("done")


if __name__ == "__main__":
    main()
