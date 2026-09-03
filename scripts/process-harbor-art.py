"""Threshold cream, erode fringe, alpha-bleed, block-reduce, bleed again."""
from PIL import Image
import numpy as np, os, glob
from scipy import ndimage
from collections import Counter

SRC = "/workspace/harbor-out/sprites"
DST = "/workspace/harbor-out/processed"
os.makedirs(DST, exist_ok=True)

CREAM = np.array([254, 250, 240])
FACTOR = {
    "trap.png": 6, "trap-stack.png": 6, "trap-buoy.png": 6,
    "kayak.png": 6, "paddle.png": 6,
}

def threshold_cream(a, fuzz=18):
    rgb = a[:,:,:3].astype(int)
    near = np.abs(rgb - CREAM).max(axis=2) <= fuzz
    a = a.copy()
    a[near, 3] = 0
    return a

def erode_alpha(a, px=1):
    alpha = a[:,:,3] > 128
    eroded = ndimage.binary_erosion(alpha, structure=np.ones((px*2+1, px*2+1)))
    out = a.copy()
    out[~eroded, 3] = 0
    return out

def bleed(a, radius=8):
    """Fill transparent RGB from nearest opaque neighbor. Alpha unchanged."""
    out = a.copy()
    opaque = a[:,:,3] > 128
    if not opaque.any() or opaque.all():
        return out
    # distance transform on the inverse
    inv = ~opaque
    _, (iy, ix) = ndimage.distance_transform_edt(inv, return_indices=True)
    out[:,:,0] = np.where(inv, a[iy, ix, 0], a[:,:,0])
    out[:,:,1] = np.where(inv, a[iy, ix, 1], a[:,:,1])
    out[:,:,2] = np.where(inv, a[iy, ix, 2], a[:,:,2])
    return out

def block_reduce(a, f):
    h, w, _ = a.shape
    H, W = h // f, w // f
    out = np.zeros((H, W, 4), dtype=np.uint8)
    for y in range(H):
        for x in range(W):
            blk = a[y*f:(y+1)*f, x*f:(x+1)*f].reshape(-1, 4)
            opaque = blk[blk[:,3] > 128]
            if len(opaque) < max(2, (f*f)//4):
                # still bleed-color from the block if any pixels exist
                if len(blk):
                    c = Counter(map(tuple, blk[:,:3])).most_common(1)[0][0]
                    out[y,x] = np.array([*c, 0], dtype=np.uint8)
                continue
            c = Counter(map(tuple, opaque)).most_common(1)[0][0]
            out[y,x] = np.array(c, dtype=np.uint8)
    return out

def process(path, f):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    a = threshold_cream(a)
    a = erode_alpha(a, 1)
    a = bleed(a)
    small = block_reduce(a, f)
    small = bleed(small)
    # crop opaque bbox except tiling strips
    name = os.path.basename(path)
    if not name.startswith(("waves", "far-shore")):
        bb = Image.fromarray(small, "RGBA").getbbox()
        if bb:
            small = small[bb[1]:bb[3], bb[0]:bb[2]]
    return Image.fromarray(small, "RGBA")

# player frames: process then pad to shared canvas, bottom-aligned
player_names = ["player-idle.png","player-walk-0.png","player-walk-1.png","player-walk-2.png","player-walk-3.png","player-use.png"]
frames = {}
for name in sorted(os.listdir(SRC)):
    if not name.endswith(".png"):
        continue
    f = FACTOR.get(name, 4)
    im = process(os.path.join(SRC, name), f)
    if name in player_names:
        frames[name] = im
    else:
        im.save(os.path.join(DST, name), "PNG")
        print(f"  {name} {im.size[0]}x{im.size[1]}")

if frames:
    W = max(i.size[0] for i in frames.values())
    H = max(i.size[1] for i in frames.values())
    for name, im in frames.items():
        c = Image.new("RGBA", (W, H), (0,0,0,0))
        # bleed color into the pad too
        a = np.asarray(im)
        pad = np.zeros((H, W, 4), dtype=np.uint8)
        y0 = H - im.size[1]
        x0 = (W - im.size[0]) // 2
        pad[y0:y0+im.size[1], x0:x0+im.size[0]] = a
        pad = bleed(pad)
        Image.fromarray(pad, "RGBA").save(os.path.join(DST, name), "PNG")
        print(f"  {name} {W}x{H} (padded)")

# water tile: crop a seamless 64-wide strip from waves-1, force POT
waves = Image.open(os.path.join(DST, "waves-1.png")).convert("RGBA")
wa = np.asarray(waves)
# take first 64 columns if wide enough, else pad
h = wa.shape[0]
tile_w = 64
if wa.shape[1] >= tile_w:
    tile = wa[:, :tile_w].copy()
    # match right edge to left for seam
    tile[:, -1] = tile[:, 0]
else:
    tile = wa
Image.fromarray(tile, "RGBA").save(os.path.join(DST, "water.png"), "PNG")
print(f"  water.png {tile.shape[1]}x{tile.shape[0]}")
print("done", len(os.listdir(DST)), "files")
