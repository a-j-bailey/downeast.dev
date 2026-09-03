#!/usr/bin/env python3
"""Draw game-ready harbor sprites. Transparent PNG, integer pixels, no labels."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "harbor"
LOCKED_CAFE = ROOT / "harbor" / "locked" / "coffee-interior.png"

# Matches src/harbor/palette.ts and harbor/ART.md
PAPER = (255, 252, 240, 255)
INK = (16, 15, 15, 255)
NAVY = (26, 39, 68, 255)
NAVY2 = (36, 53, 86, 255)
CREAM = (240, 230, 200, 255)
TEAK = (139, 90, 60, 255)
TEAK_DK = (92, 58, 40, 255)
TEAK_LT = (168, 118, 78, 255)
WATER = (31, 84, 120, 255)
WATER_DEEP = (22, 58, 88, 255)
WATER_HI = (58, 122, 154, 255)
FOAM = (220, 232, 238, 255)
SHAKE = (138, 134, 128, 255)
SHAKE2 = (118, 114, 108, 255)
SHAKE_DK = (94, 91, 86, 255)
ROOF = (63, 61, 58, 255)
GRANITE = (122, 122, 114, 255)
GRANITE2 = (98, 98, 92, 255)
GRANITE_DK = (78, 78, 72, 255)
BRICK = (163, 59, 50, 255)
BRICK2 = (140, 48, 42, 255)
MORTAR = (196, 168, 140, 255)
TAN = (196, 165, 116, 255)
TAN2 = (176, 148, 100, 255)
MOSS = (74, 107, 50, 255)
GRASS = (90, 122, 40, 255)
OLIVE = (92, 107, 50, 255)
DOOR = (42, 111, 106, 255)
DOOR_DK = (28, 84, 80, 255)
RED = (175, 48, 41, 255)
DUSK = (188, 82, 21, 255)
SUN = (173, 131, 1, 255)
HAIR = (58, 40, 24, 255)
BOOT = (74, 48, 32, 255)
SKIN = (212, 165, 116, 255)
WHITE = (255, 252, 240, 255)
BLACK = (16, 15, 15, 255)
TEAL = (42, 111, 106, 255)
YELLOW = (208, 162, 21, 255)
BUOY_R = (196, 64, 52, 255)
BUOY_Y = (208, 162, 21, 255)
CLEAR = (0, 0, 0, 0)


class G:
    def __init__(self, w: int, h: int) -> None:
        self.im = Image.new("RGBA", (w, h), CLEAR)
        self.px = self.im.load()
        self.w = w
        self.h = h

    def p(self, x: int, y: int, c: tuple[int, int, int, int]) -> None:
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = c

    def fill(self, x: int, y: int, w: int, h: int, c: tuple[int, int, int, int]) -> None:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p(xx, yy, c)

    def hline(self, x: int, y: int, w: int, c: tuple[int, int, int, int]) -> None:
        for xx in range(x, x + w):
            self.p(xx, y, c)

    def vline(self, x: int, y: int, h: int, c: tuple[int, int, int, int]) -> None:
        for yy in range(y, y + h):
            self.p(x, yy, c)

    def outline(self, x: int, y: int, w: int, h: int, c: tuple[int, int, int, int]) -> None:
        self.hline(x, y, w, c)
        self.hline(x, y + h - 1, w, c)
        self.vline(x, y, h, c)
        self.vline(x + w - 1, y, h, c)

    def save(self, name: str) -> None:
        path = OUT / name
        self.im.save(path, "PNG", optimize=True)
        print(f"  {path.name} {self.w}x{self.h}")


def font3x5() -> dict[str, list[str]]:
    return {
        "A": ["010", "101", "111", "101", "101"],
        "B": ["110", "101", "110", "101", "110"],
        "C": ["011", "100", "100", "100", "011"],
        "D": ["110", "101", "101", "101", "110"],
        "E": ["111", "100", "110", "100", "111"],
        "F": ["111", "100", "110", "100", "100"],
        "G": ["011", "100", "101", "101", "011"],
        "H": ["101", "101", "111", "101", "101"],
        "I": ["111", "010", "010", "010", "111"],
        "K": ["101", "101", "110", "101", "101"],
        "N": ["101", "111", "111", "101", "101"],
        "O": ["010", "101", "101", "101", "010"],
        "P": ["110", "101", "110", "100", "100"],
        "R": ["110", "101", "110", "101", "101"],
        "T": ["111", "010", "010", "010", "010"],
        "U": ["101", "101", "101", "101", "010"],
        "X": ["101", "101", "010", "101", "101"],
        " ": ["000", "000", "000", "000", "000"],
    }


def text(g: G, x: int, y: int, s: str, c: tuple[int, int, int, int]) -> None:
    glyphs = font3x5()
    cx = x
    for ch in s:
        rows = glyphs.get(ch, glyphs[" "])
        for iy, row in enumerate(rows):
            for ix, bit in enumerate(row):
                if bit == "1":
                    g.p(cx + ix, y + iy, c)
        cx += 4


def shakes(g: G, x: int, y: int, w: int, h: int) -> None:
    tones = [SHAKE, SHAKE2, SHAKE_DK, SHAKE]
    row = 0
    yy = y
    while yy < y + h:
        ox = 2 if row % 2 else 0
        xx = x - ox
        while xx < x + w:
            col = tones[(xx // 5 + row) % len(tones)]
            bw = 5
            bh = 3
            for dy in range(bh):
                for dx in range(bw):
                    px, py = xx + dx, yy + dy
                    if x <= px < x + w and y <= py < y + h:
                        g.p(px, py, col if dy < 2 else SHAKE_DK)
            xx += 5
        yy += 3
        row += 1


def shingles(g: G, x: int, y: int, w: int, h: int) -> None:
    row = 0
    yy = y
    while yy < y + h:
        ox = 3 if row % 2 else 0
        xx = x - ox
        while xx < x + w:
            for dx in range(6):
                px = xx + dx
                if x <= px < x + w:
                    g.p(px, yy, ROOF if dx != 5 else INK)
                    if yy + 1 < y + h:
                        g.p(px, yy + 1, SHAKE_DK if dx % 2 == 0 else ROOF)
            xx += 6
        yy += 2
        row += 1


def bricks(g: G, x: int, y: int, w: int, h: int, a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> None:
    g.fill(x, y, w, h, MORTAR)
    row = 0
    yy = y
    while yy < y + h:
        ox = 3 if row % 2 else 0
        xx = x - ox
        while xx < x + w:
            col = a if (xx + row) % 2 == 0 else b
            g.fill(max(xx, x), yy, min(5, x + w - max(xx, x)), min(3, y + h - yy), col)
            xx += 6
        yy += 4
        row += 1


def granite(g: G, x: int, y: int, w: int, h: int) -> None:
    tones = [GRANITE, GRANITE2, GRANITE_DK, SHAKE]
    g.fill(x, y, w, h, GRANITE_DK)
    yy = y
    row = 0
    while yy < y + h:
        xx = x
        ox = 4 if row % 2 else 0
        xx -= ox
        while xx < x + w:
            bw = 7 + (xx + row) % 5
            bh = 5 + row % 3
            col = tones[(xx + row) % 4]
            g.fill(max(xx, x) + 1, yy + 1, min(bw - 2, x + w - max(xx, x) - 1), min(bh - 2, y + h - yy - 1), col)
            xx += bw
        yy += 6
        row += 1
    for i in range(0, w, 9):
        g.p(x + i + 2, y + h - 2, MOSS)
        g.p(x + i + 3, y + h - 1, MOSS)


def window(g: G, x: int, y: int, w: int, h: int, night: bool = False) -> None:
    g.fill(x, y, w, h, INK if night else (40, 70, 90, 255))
    g.outline(x, y, w, h, CREAM)
    g.vline(x + w // 2, y, h, CREAM)
    g.hline(x, y + h // 2, w, CREAM)


def roof_peak(g: G, x: int, y: int, w: int, rise: int) -> int:
    """Triangle roof. Returns eave y."""
    cx = x + w // 2
    for i in range(rise):
        half = 2 + int((w // 2) * (i / max(rise - 1, 1)))
        left = cx - half
        width = half * 2
        g.hline(left, y + i, width, ROOF)
        g.p(left, y + i, INK)
        g.p(left + width - 1, y + i, INK)
        if i > 2 and i % 2 == 0:
            g.hline(left + 1, y + i, width - 2, SHAKE_DK)
    return y + rise


def draw_shack(red_door: bool, buoy: bool) -> G:
    w, h = 56, 54
    g = G(w, h)
    eave = roof_peak(g, 2, 0, 52, 14)
    g.fill(4, eave, 48, 2, TEAK_DK)
    shakes(g, 6, eave + 2, 44, 32)
    g.outline(6, eave + 2, 44, 32, INK)
    dy = eave + 12
    if red_door:
        g.fill(10, dy, 12, 22, RED)
        g.outline(10, dy, 12, 22, INK)
        g.p(20, dy + 12, YELLOW)
        window(g, 28, dy + 2, 16, 14)
    else:
        g.fill(10, dy, 12, 22, DOOR)
        g.outline(10, dy, 12, 22, INK)
        g.p(20, dy + 12, YELLOW)
        window(g, 28, dy + 2, 16, 14)
        if buoy:
            g.fill(46, dy + 4, 5, 10, BUOY_R)
            g.fill(46, dy + 8, 5, 3, WHITE)
            g.outline(46, dy + 4, 5, 10, INK)
    g.fill(6, eave + 34, 44, 3, TEAK_DK)
    for i in range(4, 52, 6):
        g.p(i, h - 4, GRASS)
        g.p(i + 1, h - 3, GRASS)
    return g


def draw_coffee_shop() -> G:
    w, h = 100, 78
    g = G(w, h)
    # roof
    g.fill(8, 10, 84, 16, ROOF)
    shingles(g, 8, 10, 84, 16)
    g.hline(6, 25, 88, TEAK_DK)
    for i in range(6, 94, 2):
        g.p(i, 9, ROOF)
    g.p(50, 6, ROOF)
    g.p(49, 7, ROOF)
    g.p(51, 7, ROOF)
    # chimney
    g.fill(78, 2, 10, 14, BRICK)
    g.outline(78, 2, 10, 14, INK)
    g.fill(77, 1, 12, 3, SHAKE_DK)
    shakes(g, 10, 26, 80, 44)
    g.outline(10, 26, 80, 44, INK)
    # awning
    for i in range(0, 36, 4):
        col = WHITE if (i // 4) % 2 == 0 else DOOR
        g.fill(16 + i, 28, 4, 6, col)
    g.hline(16, 34, 36, TEAK_DK)
    # window
    g.fill(16, 36, 36, 22, INK)
    g.outline(16, 36, 36, 22, CREAM)
    g.p(32, 42, YELLOW)
    g.p(33, 43, YELLOW)
    g.fill(30, 48, 8, 6, CREAM)
    g.fill(32, 46, 4, 3, CREAM)
    text(g, 22, 50, "C", CREAM)
    # door
    g.fill(58, 40, 14, 30, DOOR)
    g.outline(58, 40, 14, 30, INK)
    g.fill(61, 44, 8, 10, (30, 50, 70, 255))
    g.p(70, 56, YELLOW)
    # hanging sign
    g.vline(86, 30, 10, TEAK_DK)
    g.fill(80, 38, 14, 12, TEAK)
    g.outline(80, 38, 14, 12, INK)
    g.fill(84, 41, 6, 6, CREAM)
    g.fill(86, 40, 2, 2, CREAM)
    # planter
    g.fill(16, 58, 36, 6, TEAK_DK)
    for i in range(18, 50, 5):
        g.p(i, 56, DUSK)
        g.p(i + 1, 55, DUSK)
        g.p(i, 57, GRASS)
    g.fill(10, 70, 80, 3, TEAK_DK)
    return g


def draw_pier() -> G:
    w, h = 88, 52
    g = G(w, h)
    # deck
    g.fill(8, 4, 72, 10, TEAK)
    for y in range(4, 14, 2):
        g.hline(8, y, 72, TEAK if y % 4 == 0 else TEAK_LT)
    g.outline(8, 4, 72, 10, TEAK_DK)
    g.fill(70, 6, 6, 4, INK)  # cleat
    g.fill(72, 5, 2, 6, SHAKE)
    # pilings
    for x in (10, 34, 58, 78):
        g.fill(x, 14, 6, 34, TEAK_DK)
        g.fill(x + 1, 14, 4, 34, TEAK)
        g.fill(x, 40, 6, 8, MOSS)
        g.outline(x, 14, 6, 38, INK)
    # life ring
    g.outline(36, 18, 8, 8, WHITE)
    g.outline(37, 19, 6, 6, RED)
    g.outline(38, 20, 4, 4, WHITE)
    return g


def draw_boat(underway: bool) -> G:
    w, h = 112, 42
    g = G(w, h)
    # hull
    for y in range(18, 34):
        inset = 0 if y < 22 else (y - 22) // 3
        left = 8 + inset
        right = 104 - inset
        col = NAVY if y < 30 else NAVY2
        g.hline(left, y, right - left, col)
    g.hline(10, 31, 90, RED)  # waterline
    # bow point
    for i in range(8):
        g.vline(7 + i, 18 + i // 2, 12 - i // 2, NAVY)
    # cream cabin
    g.fill(38, 8, 36, 14, CREAM)
    g.outline(38, 8, 36, 14, TEAK_DK)
    g.fill(42, 12, 6, 6, INK)
    g.fill(52, 12, 6, 6, INK)
    g.fill(62, 12, 6, 6, INK)
    # windshield
    for i in range(10):
        g.hline(28 + i, 8 + i // 2, 12, TEAK)
        g.hline(30 + i, 9 + i // 2, 8, (180, 200, 210, 255))
    # deck / cockpit
    g.fill(74, 16, 26, 8, TEAK)
    g.fill(78, 18, 8, 4, NAVY2)
    g.fill(90, 18, 8, 4, NAVY2)
    # flagpole + flag at stern (right, since bow is left)
    g.vline(100, 4, 16, TEAK_DK)
    g.fill(101, 4, 6, 4, RED)
    # bow fitting
    g.fill(8, 16, 3, 3, SHAKE)
    if underway:
        for i in range(18):
            y = 32 + (i % 3)
            g.p(70 + i, y, FOAM)
            g.p(72 + i, y + 1, WATER_HI)
        for i in range(12):
            g.p(100 + i // 2, 30 + (i % 4), FOAM)
            g.p(104 + i // 3, 32 + i % 3, WHITE)
    return g


def draw_wake() -> G:
    g = G(36, 14)
    for i in range(18):
        g.p(i, 4 + (i % 3), FOAM)
        g.p(i + 2, 6 + ((i + 1) % 3), WHITE)
        g.p(i + 8, 8 + (i % 2), WATER_HI)
    for i in range(10):
        g.p(16 + i, 3 + i // 3, FOAM)
        g.p(16 + i, 10 - i // 3, FOAM)
    return g


def draw_seawall() -> G:
    g = G(48, 28)
    granite(g, 0, 0, 48, 24)
    g.fill(0, 24, 48, 4, WATER_DEEP)
    g.hline(0, 24, 48, MOSS)
    return g


def draw_seawall_stairs() -> G:
    g = G(32, 28)
    granite(g, 0, 0, 32, 24)
    for i in range(4):
        g.fill(8 + i * 4, 4 + i * 5, 16 - i, 5, GRANITE)
        g.hline(8 + i * 4, 4 + i * 5, 16 - i, CREAM)
    g.fill(0, 24, 32, 4, WATER_DEEP)
    return g


def draw_ground() -> G:
    g = G(32, 22)
    g.fill(0, 0, 32, 22, (120, 92, 60, 255))
    tones = [(138, 108, 70, 255), (104, 80, 52, 255), (90, 70, 46, 255), TEAK_DK]
    for y in range(22):
        for x in range(32):
            if (x * 7 + y * 13) % 5 == 0:
                g.p(x, y, tones[(x + y) % 4])
    for x in range(0, 32, 5):
        g.p(x + 1, 18, GRASS)
        g.p(x + 2, 17, GRASS)
        g.p(x, 19, MOSS)
    return g


def draw_trap(stacked: bool, buoy: bool) -> G:
    h = 22 if stacked else 14
    g = G(24, h)
    def one(oy: int) -> None:
        g.outline(2, oy, 20, 10, TEAK_DK)
        g.fill(3, oy + 1, 18, 8, TEAK)
        for x in range(4, 20, 3):
            g.vline(x, oy + 1, 8, MOSS)
        g.hline(3, oy + 4, 18, TEAK_DK)
    one(h - 12)
    if stacked:
        one(2)
    if buoy:
        g.fill(10, 0, 4, 4, BUOY_R)
        g.fill(10, 2, 4, 2, WHITE)
    return g


def draw_sign(label: str, arrow_left: bool) -> G:
    g = G(44, 46)
    g.fill(20, 14, 4, 30, TEAK_DK)
    g.fill(21, 14, 2, 30, TEAK)
    g.fill(18, 42, 8, 4, GRASS)
    g.p(19, 41, GRASS)
    g.fill(4, 8, 36, 12, TEAK)
    g.outline(4, 8, 36, 12, INK)
    if arrow_left:
        for i in range(6):
            g.hline(4 - 0, 10 + i, 1, TEAK)
        g.fill(2, 11, 4, 6, TEAK)
        g.p(1, 13, TEAK)
        g.p(0, 14, TEAK)
    text(g, 8, 11, label, CREAM)
    return g


def draw_kayak() -> G:
    g = G(52, 16)
    for y in range(6, 12):
        inset = abs(y - 8)
        g.hline(4 + inset, y, 44 - inset * 2, (46, 110, 168, 255))
    g.hline(6, 6, 40, NAVY)
    g.hline(8, 11, 36, NAVY2)
    g.fill(22, 7, 8, 4, NAVY)
    g.fill(14, 8, 4, 2, SHAKE)
    g.fill(34, 8, 4, 2, SHAKE)
    return g


def draw_paddle() -> G:
    g = G(40, 8)
    g.hline(8, 3, 24, INK)
    g.fill(2, 1, 8, 6, SUN)
    g.fill(30, 1, 8, 6, SUN)
    g.outline(2, 1, 8, 6, INK)
    g.outline(30, 1, 8, 6, INK)
    return g


def draw_lighthouse() -> G:
    g = G(72, 64)
    # rocks
    g.fill(8, 44, 56, 16, GRANITE_DK)
    g.fill(12, 40, 48, 10, GRANITE)
    for i in range(8, 64, 7):
        g.fill(i, 50, 6, 10, GRANITE2 if i % 2 else GRANITE_DK)
    g.hline(8, 60, 56, WATER)
    g.hline(10, 61, 50, FOAM)
    # trees
    for tx, ty in ((12, 28), (18, 24), (54, 26), (60, 30)):
        g.fill(tx + 3, ty + 14, 3, 8, TEAK_DK)
        g.fill(tx, ty, 9, 16, OLIVE)
        g.fill(tx + 2, ty - 4, 5, 8, MOSS)
    # cottage
    g.fill(28, 32, 18, 14, WHITE)
    g.fill(28, 26, 18, 8, RED)
    g.vline(36, 20, 8, TEAK_DK)
    g.fill(34, 18, 6, 4, BRICK)
    window(g, 32, 36, 8, 6)
    # tower
    g.fill(44, 8, 10, 38, WHITE)
    g.outline(44, 8, 10, 38, SHAKE)
    g.fill(42, 4, 14, 8, INK)
    g.fill(46, 2, 6, 6, SUN)
    g.hline(42, 12, 14, INK)
    # fence
    for x in range(22, 50, 4):
        g.vline(x, 42, 6, WHITE)
    g.hline(22, 44, 28, WHITE)
    return g


def draw_far_shore() -> G:
    g = G(96, 28)
    for x in range(96):
        ht = 8 + (x * 5 + 3) % 7
        g.vline(x, 28 - ht, ht, GRANITE2 if x % 5 == 0 else GRANITE)
        if x % 9 == 0:
            g.fill(x, 28 - ht - 10, 5, 10, OLIVE)
            g.p(x + 2, 28 - ht - 12, MOSS)
    g.fill(40, 10, 12, 10, WHITE)
    g.fill(42, 6, 8, 6, ROOF)
    g.vline(48, 2, 6, SHAKE_DK)
    return g


def draw_shark() -> G:
    g = G(56, 18)
    # body
    for y in range(6, 14):
        inset = abs(y - 9)
        g.hline(8 + inset, y, 36 - inset * 2, GRANITE_DK)
    g.hline(10, 12, 30, SHAKE)
    g.hline(12, 13, 24, WHITE)
    # tail
    g.fill(42, 6, 8, 3, GRANITE_DK)
    g.fill(42, 12, 8, 3, GRANITE_DK)
    g.p(50, 5, GRANITE_DK)
    g.p(50, 14, GRANITE_DK)
    # dorsal
    g.fill(22, 2, 6, 6, GRANITE_DK)
    g.p(24, 0, GRANITE_DK)
    g.p(25, 1, GRANITE_DK)
    # eye
    g.p(12, 8, INK)
    g.p(13, 8, WHITE)
    return g


def draw_fin() -> G:
    g = G(14, 12)
    g.p(6, 1, GRANITE_DK)
    g.fill(5, 2, 4, 6, GRANITE_DK)
    g.fill(4, 6, 6, 3, GRANITE)
    g.hline(3, 9, 8, WATER_HI)
    g.p(4, 10, FOAM)
    g.p(10, 10, FOAM)
    return g


def draw_waves(kind: int) -> G:
    g = G(64, 22)
    deep = WATER_DEEP if kind == 2 else WATER
    mid = WATER if kind == 2 else WATER_HI
    g.fill(0, 0, 64, 22, deep)
    for x in range(64):
        phase = (x + kind * 11) % 16
        y = 4 + (1 if phase < 8 else 3) + (2 if kind == 1 else 0)
        g.p(x, y, mid)
        g.p(x, y + 1, FOAM if kind == 1 and phase % 4 == 0 else mid)
        if kind == 1 and phase in (0, 1, 8, 9):
            g.p(x, y - 1, WHITE)
        g.hline(x, 12, 1, WATER_HI if (x + kind) % 5 == 0 else deep)
        g.p(x, 18, WATER_DEEP)
    return g


def draw_cloud() -> G:
    g = G(44, 14)
    fog = (200, 196, 184, 220)
    g.fill(8, 6, 28, 6, fog)
    g.fill(14, 3, 16, 6, fog)
    g.fill(4, 8, 12, 4, fog)
    g.fill(30, 7, 10, 5, fog)
    return g


def draw_moon() -> G:
    g = G(16, 16)
    cx, cy, r = 8, 8, 7
    for y in range(16):
        for x in range(16):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                g.p(x, y, PAPER)
    g.p(6, 6, SHAKE)
    g.p(10, 8, SHAKE)
    g.p(7, 10, CREAM)
    return g


def draw_sun() -> G:
    g = G(16, 16)
    cx, cy, r = 8, 8, 6
    for y in range(16):
        for x in range(16):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                g.p(x, y, SUN)
    return g


def draw_player(frame: str) -> G:
    g = G(18, 32)
    # feet / legs depend on frame
    # body
    # hair
    g.fill(5, 2, 8, 5, HAIR)
    g.fill(4, 3, 10, 3, HAIR)
    # head
    g.fill(6, 5, 6, 6, SKIN)
    g.p(10, 7, INK)  # eye, facing right
    g.p(11, 8, INK)
    # torso sweater
    g.fill(5, 11, 8, 10, NAVY)
    g.fill(4, 12, 10, 8, NAVY)
    g.hline(5, 11, 8, NAVY2)
    # arms
    if frame == "use":
        g.fill(13, 13, 5, 3, NAVY)
        g.fill(16, 13, 2, 2, SKIN)
        g.p(17, 12, GRASS)
        g.p(16, 11, GRASS)
        g.p(17, 14, GRASS)
        g.fill(3, 14, 3, 6, NAVY)
        g.fill(3, 19, 2, 2, SKIN)
    else:
        swing = {"idle": 0, "w0": 2, "w1": 0, "w2": -2, "w3": 0}[frame]
        g.fill(3, 13 + max(0, -swing // 2), 3, 7, NAVY)
        g.fill(12, 13 + max(0, swing // 2), 3, 7, NAVY)
        g.fill(3, 19 + max(0, -swing // 2), 2, 2, SKIN)
        g.fill(13, 19 + max(0, swing // 2), 2, 2, SKIN)
    # pants
    g.fill(5, 21, 8, 5, OLIVE)
    if frame in ("idle", "use", "w1", "w3"):
        g.fill(5, 24, 3, 4, OLIVE)
        g.fill(10, 24, 3, 4, OLIVE)
        g.fill(5, 28, 3, 3, BOOT)
        g.fill(10, 28, 3, 3, BOOT)
    elif frame == "w0":
        g.fill(9, 23, 4, 5, OLIVE)  # right forward
        g.fill(4, 24, 3, 3, OLIVE)
        g.fill(10, 28, 4, 3, BOOT)
        g.fill(4, 27, 3, 3, BOOT)
    else:  # w2
        g.fill(4, 23, 4, 5, OLIVE)
        g.fill(11, 24, 3, 3, OLIVE)
        g.fill(4, 28, 4, 3, BOOT)
        g.fill(11, 27, 3, 3, BOOT)
    # belt
    g.hline(5, 21, 8, TEAK_DK)
    return g


def draw_barrel() -> G:
    g = G(12, 16)
    g.fill(2, 2, 8, 12, TEAK)
    g.outline(2, 2, 8, 12, TEAK_DK)
    g.hline(2, 5, 8, TEAK_LT)
    g.hline(2, 11, 8, TEAK_LT)
    return g


def install_locked_cafe() -> None:
    if not LOCKED_CAFE.is_file():
        raise SystemExit(f"locked cafe missing: {LOCKED_CAFE}")
    dest = OUT / "coffee-interior.png"
    shutil.copyfile(LOCKED_CAFE, dest)
    print(f"  {dest.name} locked from harbor/locked/")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("harbor sprites ->", OUT)

    draw_player("idle").save("player-idle.png")
    for i, fr in enumerate(("w0", "w1", "w2", "w3")):
        draw_player(fr).save(f"player-walk-{i}.png")
    draw_player("use").save("player-use.png")

    draw_boat(False).save("boat.png")
    draw_boat(True).save("boat-underway.png")
    draw_wake().save("wake.png")
    draw_pier().save("pier.png")
    draw_kayak().save("kayak.png")
    draw_paddle().save("paddle.png")

    draw_shack(True, False).save("shack-a.png")
    draw_shack(False, True).save("shack-b.png")
    draw_coffee_shop().save("coffee-shop.png")
    install_locked_cafe()

    draw_seawall().save("seawall.png")
    draw_seawall_stairs().save("seawall-stairs.png")
    draw_ground().save("ground.png")
    draw_trap(False, False).save("trap.png")
    draw_trap(True, False).save("trap-stack.png")
    draw_trap(False, True).save("trap-buoy.png")
    draw_sign("GITHUB", True).save("sign-github.png")
    draw_sign("X", False).save("sign-x.png")
    draw_barrel().save("barrel.png")

    draw_lighthouse().save("lighthouse.png")
    draw_far_shore().save("far-shore.png")
    draw_shark().save("shark.png")
    draw_fin().save("shark-fin.png")
    for i in range(3):
        draw_waves(i).save(f"waves-{i}.png")
    draw_cloud().save("cloud.png")
    draw_moon().save("moon.png")
    draw_sun().save("sun.png")

    # tiny fog bank (dither)
    fog = G(48, 16)
    for y in range(16):
        for x in range(48):
            if (x + y) % 2 == 0 and 2 < y < 14 and 2 < x < 46:
                fog.p(x, y, (255, 252, 240, 140))
    fog.save("fog.png")


if __name__ == "__main__":
    main()
