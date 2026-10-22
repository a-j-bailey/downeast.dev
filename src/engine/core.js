/**
 * Shared scene math for Downeast.
 * Every animated value is a function of t in [0, LOOP) so a 240 s loop seals.
 */

export const W = 480;
export const H = 270;
export const SCALE = 4;
export const OUT_W = W * SCALE;
export const OUT_H = H * SCALE;
export const LOOP = 240;
export const TAU = Math.PI * 2;

export const frac = (v) => v - Math.floor(v);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => {
  const x = clamp((v - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

/** Sine with an integer number of cycles per loop. */
export const wave = (t, k, ph = 0) => Math.sin(TAU * ((k * t) / LOOP + ph));

/** Discrete slot when the loop is split into `perLoop` equal steps. */
export const step = (t, perLoop) => Math.floor((t * perLoop) / LOOP) % perLoop;

/** Smooth 0→1→0 envelope over [a, b] with fade length f (loop seconds). */
export const env = (t, a, b, f) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));

/** Particle clock: n integer cycles per loop. */
export function cycle(t, n, ph = 0) {
  const q = (t * n) / LOOP + ph;
  const f = Math.floor(q);
  return { cyc: ((f % n) + n) % n, u: q - f };
}

/** Integer pixel offset scrolling `k` times across `width` per loop. */
export const scroll = (t, k, width) => Math.floor(frac((k * t) / LOOP) * width);

/** Integer mix of three seeds → [0, 1). SplitMix-style, not used inside render. */
export function hash(a, b = 0, c = 0) {
  let x = (a | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (b | 0), 0x85ebca6b);
  x ^= Math.imul(c | 0, 0xc2b2ae35);
  x = Math.imul(x ^ (x >>> 13), 0x27d4eb2d);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Seeded PRNG (xorshift32). Build-time layout only — never call from render(t). */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
);
export const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

export const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function mix(a, b, t) {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}

export function rgba(h, a) {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${a})`;
}

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  return [c, x];
}

export const px = (c, x, y, col) => {
  c.fillStyle = col;
  c.fillRect(x, y, 1, 1);
};

export const rect = (c, x, y, w, h, col) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

export function ditherFill(w, h, palette, valueFn) {
  const pal = palette.map(hex);
  const [c, x] = makeCanvas(w, h);
  const img = x.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let i = 0; i < w; i++) {
      const v = valueFn(i, y);
      if (v < 0) continue;
      const f = clamp(v, 0, 1) * (pal.length - 1);
      let k = Math.floor(f);
      if (f - k > bayer(i, y)) k++;
      const col = pal[Math.min(k, pal.length - 1)];
      const o = (y * w + i) * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function makeHalo(r, col, maxA, pow = 2, levels = 6) {
  const rgb = hex(col);
  const s = r * 2 + 1;
  const [c, x] = makeCanvas(s, s);
  const img = x.createImageData(s, s);
  const d = img.data;
  for (let y = 0; y < s; y++) {
    for (let i = 0; i < s; i++) {
      const dd = Math.hypot(i - r, y - r) / r;
      if (dd >= 1) continue;
      const q = Math.floor(Math.pow(1 - dd, pow) * levels + bayer(i, y)) / levels;
      if (q <= 0) continue;
      const o = (y * s + i) * 4;
      d[o] = rgb[0];
      d[o + 1] = rgb[1];
      d[o + 2] = rgb[2];
      d[o + 3] = Math.round(Math.min(1, q) * maxA * 255);
    }
  }
  x.putImageData(img, 0, 0);
  return { c, r };
}

export function drawHalo(ctx, hl, x, y, a = 1) {
  if (a <= 0.004) return;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(hl.c, Math.round(x) - hl.r, Math.round(y) - hl.r);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

export function glyph(c, g, x, y, col) {
  c.fillStyle = col;
  g.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === "1") c.fillRect(x + i, y + j, 1, 1);
  });
}

export const FONT3 = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["110", "101", "101", "101", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "110", "011"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "011", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  "-": ["000", "000", "111", "000", "000"],
  ".": ["000", "000", "000", "000", "010"],
  ":": ["000", "010", "000", "010", "000"],
  "!": ["010", "010", "010", "000", "010"],
  "'": ["010", "010", "000", "000", "000"],
  "&": ["010", "101", "010", "101", "011"],
  "/": ["001", "001", "010", "100", "100"],
  " ": ["000", "000", "000", "000", "000"],
};

export const textWidth = (s, gap = 1) => (s.length ? s.length * (3 + gap) - gap : 0);

export function text(c, s, x, y, col, gap = 1) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT3[ch];
    if (g) glyph(c, g, cx, y, col);
    cx += 3 + gap;
  }
  return cx - x - gap;
}

let reflectScratch = null;
export function reflect(ctx, t, { top, rows, squash = 1.6, alpha = 0.5, k1 = 45, k2 = 110, amp = 0.6, grow = 0.05, x = 0, w = W }) {
  const span = Math.min(top, Math.floor((rows - 1) * squash) + 1);
  if (span <= 0) return;
  const y0 = top - span;
  if (!reflectScratch) reflectScratch = makeCanvas(W, H);
  const [scratch, sx] = reflectScratch;
  sx.globalCompositeOperation = "copy";
  sx.drawImage(ctx.canvas, x, y0, w, span, x, 0, w, span);
  for (let k = 0; k < rows; k++) {
    const sy = top - 1 - Math.floor(k * squash);
    if (sy < 0) break;
    const off = Math.round(
      Math.sin(TAU * k1 * t / LOOP + k * 0.55) * (amp + k * grow) +
        Math.sin(TAU * k2 * t / LOOP - k * 1.3) * 0.7,
    );
    ctx.globalAlpha = alpha * (1 - k / (rows + 20));
    ctx.drawImage(scratch, x, sy - y0, w, 1, x + off, top + k, w, 1);
  }
  ctx.globalAlpha = 1;
}

export function streak(ctx, t, sx, w, col, a, seed, y0, y1) {
  ctx.fillStyle = col;
  for (let y = y0; y < y1; y++) {
    const k = y - y0;
    const dsh =
      Math.sin(k * 1.9 + seed + TAU * 150 * t / LOOP) +
      0.7 * Math.sin(k * 0.63 - TAU * 97 * t / LOOP + seed * 2);
    if (dsh < 0.15) continue;
    const len = Math.max(
      1,
      Math.round(w * (0.55 + 0.45 * Math.sin(k * 0.47 + TAU * 131 * t / LOOP + seed)) + k * 0.06 * w),
    );
    const xo = Math.round(Math.sin(TAU * 83 * t / LOOP + k * 0.83 + seed) * (1 + k * 0.04));
    ctx.globalAlpha = a * Math.max(0, 1 - k / 52) * (0.6 + 0.4 * Math.min(1, dsh));
    ctx.fillRect(Math.round(sx - len / 2) + xo, y, len, 1);
  }
  ctx.globalAlpha = 1;
}
