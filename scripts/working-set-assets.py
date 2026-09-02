#!/usr/bin/env python3
"""Build Working set print, paper, rope, dock, and enamel-tag assets.

Keeps Adam's boat drawing. Recolors and grain-treats it as a block print.
Reads generated source plates from WORKING_SET_SRC (default
/opt/cursor/artifacts/assets) and writes web-sized files under public/.
"""

from __future__ import annotations

import os
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC = Path(os.environ.get("WORKING_SET_SRC", "/opt/cursor/artifacts/assets"))

NAVY = (27, 42, 74)
BITE = (122, 48, 28)
PAPER_FALLBACK = (232, 226, 212)


def load_rgb(name: str) -> Image.Image:
    path = SRC / name
    if not path.exists():
        raise SystemExit(f"missing source plate {path}")
    return Image.open(path).convert("RGB")


def save_jpeg(im: Image.Image, dest: Path, *, size: tuple[int, int], quality: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    fitted = im.copy()
    fitted.thumbnail(size, Image.Resampling.LANCZOS)
    fitted.convert("RGB").save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"wrote {dest} {fitted.size[0]}x{fitted.size[1]}")


def save_png(im: Image.Image, dest: Path, *, max_width: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    out = im.copy()
    if out.width > max_width:
        height = round(out.height * (max_width / out.width))
        out = out.resize((max_width, height), Image.Resampling.LANCZOS)
    out.save(dest, "PNG", optimize=True)
    print(f"wrote {dest} {out.size[0]}x{out.size[1]}")


def mean_color(im: Image.Image) -> tuple[int, int, int]:
    arr = np.asarray(im.convert("RGB"), dtype=np.float32)
    mean = arr.mean(axis=(0, 1))
    return int(mean[0]), int(mean[1]), int(mean[2])


def knock_studio_gray(im: Image.Image) -> Image.Image:
    """Drop the studio backdrop, keep the object, including chipped metal."""
    rgba = np.array(im.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.float32)
    h, w, _ = rgba.shape
    sw, sh = min(12, w), min(12, h)
    corners = np.concatenate(
        [
            rgb[:sh, :sw].reshape(-1, 3),
            rgb[:sh, w - sw :].reshape(-1, 3),
            rgb[h - sh :, :sw].reshape(-1, 3),
            rgb[h - sh :, w - sw :].reshape(-1, 3),
        ]
    )
    bg = corners.mean(axis=0)
    dist = np.linalg.norm(rgb - bg, axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    # Backdrop is flat studio gray or off-white. Enamel is saturated.
    is_bg = (dist < 52) & (chroma < 26)

    vis = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if not vis[y, x] and is_bg[y, x]:
            vis[y, x] = True
            queue.append((y, x))

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)

    while queue:
        y, x = queue.popleft()
        rgba[y, x, 3] = 0
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not vis[ny, nx] and is_bg[ny, nx]:
                vis[ny, nx] = True
                queue.append((ny, nx))

    # Grommet hole is studio backdrop trapped inside the tag.
    ys = slice(int(h * 0.05), int(h * 0.24))
    xs = slice(int(w * 0.36), int(w * 0.64))
    hole = is_bg[ys, xs]
    if hole.any():
        local = np.argwhere(hole)
        center = local[np.argmin(np.linalg.norm(local - np.array([hole.shape[0] / 2, hole.shape[1] / 2]), axis=1))]
        sy = int(ys.start) + int(center[0])
        sx = int(xs.start) + int(center[1])
        vis_h = np.zeros((h, w), dtype=bool)
        qh: deque[tuple[int, int]] = deque([(sy, sx)])
        vis_h[sy, sx] = True
        while qh:
            y, x = qh.popleft()
            if not is_bg[y, x]:
                continue
            rgba[y, x, 3] = 0
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not vis_h[ny, nx]:
                    vis_h[ny, nx] = True
                    qh.append((ny, nx))

    out = Image.fromarray(rgba, "RGBA")
    bbox = out.getbbox()
    if bbox is None:
        return out
    pad = 8
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(out.width, right + pad)
    bottom = min(out.height, bottom + pad)
    return out.crop((left, top, right, bottom))


def treat_boat(*, boat: Image.Image, grain: Image.Image) -> Image.Image:
    """Stamp the existing drawing in navy ink with woodblock grain and a bite plate."""
    src = boat.convert("RGBA")
    grain_l = ImageOps.grayscale(grain).resize(src.size, Image.Resampling.LANCZOS)
    grain_arr = np.asarray(grain_l, dtype=np.float32) / 255.0
    grain_arr = (grain_arr - grain_arr.mean()) * 1.35
    grain_arr = np.clip(0.5 + grain_arr, 0.12, 0.92)

    alpha = np.asarray(src.split()[-1], dtype=np.float32) / 255.0
    # Ink squash: a one-pixel bite around the drawing.
    bite_a = np.asarray(
        src.split()[-1].filter(ImageFilter.MaxFilter(3)),
        dtype=np.float32,
    ) / 255.0

    h, w = alpha.shape
    navy_a = np.clip(alpha * (0.78 + grain_arr * 0.45), 0, 1)
    # Dry-brush skip on the thinnest ink.
    skip = grain_arr < 0.38
    navy_a = np.where(skip & (alpha < 0.55), navy_a * 0.35, navy_a)

    bite_shift = np.roll(np.roll(bite_a, 2, axis=1), 1, axis=0)
    bite_mod = np.clip(bite_shift * (0.18 + (1.0 - grain_arr) * 0.12), 0, 1)
    bite_mod = np.where(navy_a > 0.55, 0, bite_mod)

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, 0] = np.clip(
        BITE[0] * bite_mod + NAVY[0] * navy_a, 0, 255
    ).astype(np.uint8)
    out[:, :, 1] = np.clip(
        BITE[1] * bite_mod + NAVY[1] * navy_a, 0, 255
    ).astype(np.uint8)
    out[:, :, 2] = np.clip(
        BITE[2] * bite_mod + NAVY[2] * navy_a, 0, 255
    ).astype(np.uint8)
    out[:, :, 3] = np.clip((navy_a + bite_mod) * 255.0, 0, 255).astype(np.uint8)

    # Where both plates overlap, keep navy on top.
    overlap = navy_a > 0.2
    out[overlap, 0] = NAVY[0]
    out[overlap, 1] = NAVY[1]
    out[overlap, 2] = NAVY[2]
    grain_ink = (0.82 + grain_arr * 0.28)
    out[overlap, 0] = np.clip(out[overlap, 0] * grain_ink[overlap], 0, 255)
    out[overlap, 1] = np.clip(out[overlap, 1] * grain_ink[overlap], 0, 255)
    out[overlap, 2] = np.clip(out[overlap, 2] * grain_ink[overlap], 0, 255)

    return Image.fromarray(out, "RGBA")


def rope_line(rope: Image.Image) -> Image.Image:
    w, h = rope.size
    band = rope.crop((0, int(h * 0.38), w, int(h * 0.62)))
    return band.resize((1200, 96), Image.Resampling.LANCZOS)


def main() -> None:
    paper = load_rgb("paper-fiber.png")
    rope = load_rgb("rope-grain.png")
    wood = load_rgb("woodblock-grain.png")
    plank = load_rgb("dock-plank.png")
    ink = load_rgb("ink-bite.png")

    paper_mean = mean_color(paper)
    print("paper mean", "#%02x%02x%02x" % paper_mean)

    save_jpeg(paper, PUBLIC / "textures" / "paper-fiber.jpg", size=(768, 768), quality=78)
    save_jpeg(rope, PUBLIC / "textures" / "rope-grain.jpg", size=(768, 768), quality=78)
    save_jpeg(wood, PUBLIC / "textures" / "woodblock-grain.jpg", size=(768, 768), quality=78)
    save_jpeg(plank, PUBLIC / "textures" / "dock-plank.jpg", size=(1400, 900), quality=80)
    save_jpeg(ink, PUBLIC / "textures" / "ink-bite.jpg", size=(900, 600), quality=78)
    save_jpeg(rope_line(rope), PUBLIC / "textures" / "rope-line.jpg", size=(1400, 120), quality=80)

    for name in ("tag-yellow.png", "tag-red.png", "tag-green.png"):
        cut = knock_studio_gray(Image.open(SRC / name))
        save_png(cut, PUBLIC / "tags" / name, max_width=420)

    hanger_src = SRC / "tag-hanger.png"
    if hanger_src.exists():
        hanger = knock_studio_gray(Image.open(hanger_src))
        hook_bottom = min(hanger.height, max(160, int(hanger.height * 0.42)))
        hanger = hanger.crop((0, 0, hanger.width, hook_bottom))
        save_png(hanger, PUBLIC / "tags" / "hanger.png", max_width=180)

    boat = Image.open(PUBLIC / "boat.png")
    print_boat = treat_boat(boat=boat, grain=wood)
    print_boat.save(PUBLIC / "boat-print.png", "PNG", optimize=True)
    print(f"wrote {PUBLIC / 'boat-print.png'} {print_boat.size[0]}x{print_boat.size[1]}")

    # Wake in the same ink, cropped from the treated drawing.
    w, h = print_boat.size
    wake = print_boat.crop((int(w * 0.04), int(h * 0.78), int(w * 0.96), h))
    wake.save(PUBLIC / "wake.png", "PNG", optimize=True)
    print(f"wrote {PUBLIC / 'wake.png'} {wake.size[0]}x{wake.size[1]}")

    write_marks(print_boat=print_boat, paper=paper)


def onto_paper(src: Image.Image, paper: Image.Image, size: tuple[int, int]) -> Image.Image:
    mean = mean_color(paper)
    sheet = Image.new("RGB", size, mean)
    fitted = src.copy()
    fitted.thumbnail((int(size[0] * 0.82), int(size[1] * 0.82)), Image.Resampling.LANCZOS)
    x = (size[0] - fitted.width) // 2
    y = (size[1] - fitted.height) // 2
    if fitted.mode == "RGBA":
        sheet.paste(fitted, (x, y), fitted)
    else:
        sheet.paste(fitted, (x, y))
    return sheet


def write_marks(*, print_boat: Image.Image, paper: Image.Image) -> None:
    w, h = print_boat.size
    cabin = print_boat.crop((int(w * 0.28), 0, int(w * 0.62), int(h * 0.55)))
    for size, name in (
        (32, "favicon-32.png"),
        (16, "favicon-16.png"),
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
    ):
        icon = onto_paper(cabin, paper, (size, size))
        icon.save(PUBLIC / name, "PNG", optimize=True)
        print(f"wrote {PUBLIC / name} {size}x{size}")
    Image.open(PUBLIC / "favicon-32.png").save(
        PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)]
    )

    og_w, og_h = 1200, 630
    mean = mean_color(paper)
    og = Image.new("RGB", (og_w, og_h), mean)
    drawing = print_boat.copy()
    drawing.thumbnail((1080, 430), Image.Resampling.LANCZOS)
    og.paste(drawing, ((og_w - drawing.width) // 2, 58), drawing)
    try:
        from PIL import ImageDraw, ImageFont

        font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf")
        font = ImageFont.truetype(str(font_path), 52) if font_path.exists() else ImageFont.load_default()
        draw = ImageDraw.Draw(og)
        text = "downeast.dev"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((og_w - tw) // 2, og_h - th - 64), text, font=font, fill=NAVY)
    except OSError:
        pass
    og.save(PUBLIC / "og.png", "PNG", optimize=True)
    og.save(PUBLIC / "og.jpg", "JPEG", quality=88, optimize=True, progressive=True)
    print(f"wrote {PUBLIC / 'og.png'} {og_w}x{og_h}")


if __name__ == "__main__":
    main()
