/**
 * East Passage — a quiet New England harbor after Warren, Rhode Island.
 * East Bay waterfront massing (Main Street civic row, working wharf, granite light)
 * as original 480×270 pixel art. Deterministic 240 s loop.
 */
import {
  W, H, LOOP, TAU, frac, clamp, lerp, smooth, wave, step, cycle, scroll,
  hash, rng, bayer, hex, makeCanvas, makeHalo, drawHalo, reflect, streak, text,
} from "../engine/core.js";
import { mixPalette, projectSky } from "../engine/solar.js";

let ctx;

const HOR = 148;
const QUAY = 206;
const DECK = 198;
const MOON = { x: 86, y: 26 };
const LIGHT = { cx: 428, base: 196, lantern: 62, w: 16 };
const LAMP = { x: 64, arm: 52, top: 118 };
const FOCUS = 412;

let SKY = {
  phase: "night",
  day: 0,
  night: 1,
  twilight: 0.2,
  tagline: "Fog on the harbor",
  sun: { alt: -30, az: 300 },
  moon: { alt: 40, az: 90 },
};

const RGB = {};
const rgbOf = (h) => RGB[h] || (RGB[h] = hex(h));

function painter(w = W, h = H) {
  const [c, x] = makeCanvas(w, h);
  const img = x.createImageData(w, h);
  const d = img.data;
  const p = { c, x, w, h };
  p.set = (i, y, col) => {
    if (i < 0 || y < 0 || i >= w || y >= h) return;
    const k = rgbOf(col);
    const o = (y * w + i) * 4;
    d[o] = k[0];
    d[o + 1] = k[1];
    d[o + 2] = k[2];
    d[o + 3] = 255;
  };
  p.rect = (x0, y0, ww, hh, col) => {
    for (let y = y0; y < y0 + hh; y++) for (let i = x0; i < x0 + ww; i++) p.set(i, y, col);
  };
  p.line = (x0, y0, x1, y1, col) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) p.set(Math.round(lerp(x0, x1, k / n)), Math.round(lerp(y0, y1, k / n)), col);
  };
  p.done = () => {
    x.putImageData(img, 0, 0);
    return c;
  };
  return p;
}

function sprite(rows, key, flip = false) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const p = painter(w, h);
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const col = key[row[i]];
      if (col) p.set(flip ? w - 1 - i : i, y, col);
    }
  });
  return p.done();
}

function pline(x0, y0, x1, y1, col) {
  ctx.fillStyle = col;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) {
    ctx.fillRect(Math.round(lerp(x0, x1, k / n)), Math.round(lerp(y0, y1, k / n)), 1, 1);
  }
}

function tintSheet(src, fill) {
  const [c, x] = makeCanvas(src.width, src.height);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = fill;
  x.fillRect(0, 0, src.width, src.height);
  return c;
}

const gust = (t) => clamp(0.38 + 0.28 * wave(t, 4, 0.18) + 0.16 * wave(t, 11, 0.61) + 0.1 * wave(t, 23, 0.07), 0, 1);

/* ================= Sky ================= */
const PAL_NIGHT = [
  "#07080e", "#0a0d14", "#0e121c", "#121824", "#171e2c", "#1c2534",
  "#232c3c", "#2a3442", "#323a44", "#3c403c", "#4a4438", "#5a4c38",
].map(hex);
const PAL_DAWN = [
  "#1a1838", "#24204c", "#3a2c5c", "#5c4068", "#8a5a70", "#c07868",
  "#e09870", "#f0b888", "#ecc8a0", "#d4c4a0", "#b0a888", "#8a8870",
].map(hex);
const PAL_DAY = [
  "#5a94c4", "#6aa0cc", "#7aadd4", "#8cb8dc", "#a0c6e4", "#b4d2e8",
  "#c4dbe8", "#d0e0e4", "#d4dcc8", "#c8c8a8", "#b4b894", "#9eaa88",
].map(hex);
const PAL_DUSK = [
  "#141428", "#1c1838", "#302040", "#582848", "#8a3848", "#c05040",
  "#e07848", "#f09858", "#e8a878", "#c09070", "#887060", "#5a5048",
].map(hex);

function paletteFor(sky) {
  const tw = sky.sun.az < 180 ? PAL_DAWN : PAL_DUSK;
  if (sky.sun.alt >= 10) return PAL_DAY;
  if (sky.sun.alt >= 0) return mixPalette(tw, PAL_DAY, sky.sun.alt / 10);
  if (sky.sun.alt >= -12) return mixPalette(PAL_NIGHT, tw, (sky.sun.alt + 12) / 12);
  return PAL_NIGHT;
}

function bodyProject(body) {
  return projectSky(body.alt, body.az, HOR, W);
}

let skyCache = { key: "", c: null };

function renderSkySheet(sky) {
  const pal = paletteFor(sky);
  const sunP = bodyProject(sky.sun);
  const moonP = bodyProject(sky.moon);
  const [c, x] = makeCanvas(W, H);
  const img = x.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let i = 0; i < W; i++) {
      let v = Math.pow(Math.min(1, y / 160), 1.25) * 0.78;
      if (sky.sun.alt > -8) {
        v += Math.max(0, 1 - Math.hypot((i - sunP.x) / 220, (y - sunP.y) / 70)) * (0.22 + 0.35 * sky.day);
      }
      if (sky.moon.alt > 0 && sky.night > 0.15) {
        v += Math.max(0, 1 - Math.hypot((i - moonP.x) / 200, (y - moonP.y) / 70)) * 0.16 * sky.night;
      }
      v += Math.max(0, 1 - Math.hypot((i - 70) / 160, (y - 190) / 90)) * 0.12 * (0.4 + 0.6 * sky.night);
      v += Math.max(0, 1 - Math.hypot((i - 428) / 90, (y - 80) / 80)) * 0.1 * (0.3 + 0.7 * sky.night);
      const f = clamp(v, 0, 1) * (pal.length - 1);
      let k = Math.floor(f);
      if (f - k > bayer(i, y)) k++;
      const col = pal[Math.min(k, pal.length - 1)];
      const o = (y * W + i) * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

function skySheet(sky) {
  const key = `${sky.phase}:${Math.round(sky.sun.alt * 2)}:${Math.round(sky.sun.az / 4)}`;
  if (skyCache.key === key) return skyCache.c;
  skyCache = { key, c: renderSkySheet(sky) };
  return skyCache.c;
}

const STARS = [];
{
  const r = rng(41);
  while (STARS.length < 52) {
    const x = Math.floor(r() * W);
    const y = 3 + Math.floor(r() * 78);
    if (Math.hypot(x - MOON.x, y - MOON.y) < 18) continue;
    STARS.push({ x, y, k: 11 + Math.floor(r() * 70), ph: r(), b: 0.22 + r() * 0.55 });
  }
}

function renderSun() {
  const R = 8;
  const s = R * 2 + 1;
  const p = painter(s, s);
  for (let y = 0; y < s; y++) {
    for (let i = 0; i < s; i++) {
      const dd = Math.hypot(i - R, y - R);
      if (dd > R + 0.2) continue;
      let col = "#fff6c4";
      if (dd > R - 2) col = "#f0c060";
      if (dd > R - 1) col = "#e8a038";
      p.set(i, y, col);
    }
  }
  return p.done();
}

function renderMoon() {
  const R = 7;
  const s = R * 2 + 1;
  const p = painter(s, s);
  const craters = [[-2, -1, 1.4], [2, 1, 1.1], [1, -3, 0.8]];
  for (let y = 0; y < s; y++) {
    for (let i = 0; i < s; i++) {
      const dx = i - R;
      const dy = y - R;
      const dd = Math.hypot(dx, dy);
      if (dd > R + 0.25) continue;
      let col = dx + dy < -2 ? "#f2efe4" : "#d8d2c4";
      if (dd > R - 1) col = dx + dy > 0 ? "#9a9488" : "#c4bdb0";
      for (const [cx, cy, cr] of craters) if (Math.hypot(dx - cx, dy - cy) < cr) col = "#b0a898";
      p.set(i, y, col);
    }
  }
  return p.done();
}

function makeCloudLayer(def) {
  const r = rng(def.seed);
  const h = def.h;
  const puffs = [];
  for (let b = 0; b < def.banks; b++) {
    const bx = (b + r() * 0.7) * W / def.banks;
    const bw = 64 + r() * 100;
    const base = h * (0.42 + r() * 0.32);
    const np = 7 + Math.floor(r() * 6);
    for (let i = 0; i < np; i++) {
      puffs.push({
        x: bx + (r() - 0.5) * bw,
        y: base - r() * 8,
        rx: 12 + r() * 22,
        ry: 3 + r() * 5,
        base: base + 4,
      });
    }
  }
  const D = new Float32Array(W * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < W; x++) {
      let best = -9;
      for (const p of puffs) {
        let dx = x - p.x;
        dx -= Math.round(dx / W) * W;
        const dy = y - p.y;
        let v = 1 - (dx * dx) / (p.rx * p.rx) - (dy * dy) / (p.ry * p.ry);
        if (y > p.base) v -= (y - p.base) * 0.35;
        if (v > best) best = v;
      }
      D[y * W + x] = best;
    }
  }
  const [c, x] = makeCanvas(W, h);
  const img = x.createImageData(W, h);
  const d = img.data;
  const pal = [def.pal.core, def.pal.body, def.pal.top, def.pal.bot].map(hex);
  for (let y = 0; y < h; y++) {
    for (let i = 0; i < W; i++) {
      const v = D[y * W + i];
      if (v < 0.05) continue;
      let t = clamp((v - 0.05) / 0.7, 0, 1);
      if (y > h * 0.62) t = Math.min(1, t + 0.15);
      const f = t * (pal.length - 1);
      let k = Math.floor(f);
      if (f - k > bayer(i, y)) k++;
      const col = pal[Math.min(k, pal.length - 1)];
      const o = (y * W + i) * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = Math.round(clamp(v, 0, 1) * 210);
    }
  }
  x.putImageData(img, 0, 0);
  return { c, h, k: def.k };
}

const CLOUDS = [
  { seed: 19, y: -6, h: 52, banks: 5, k: 2, pal: { top: "#2a3648", body: "#161e28", core: "#10161e", bot: "#2c343c" } },
  { seed: 33, y: 22, h: 48, banks: 6, k: 3, pal: { top: "#3a4654", body: "#1c2630", core: "#141c24", bot: "#3c4038" } },
  { seed: 57, y: 48, h: 44, banks: 5, k: 5, pal: { top: "#4a5048", body: "#262e34", core: "#1c2428", bot: "#5a5040" } },
].map(makeCloudLayer);

/* ================= Far shore ================= */
function farCottage(p, cx, ridgeY, w, h, lit, lights) {
  p.rect(cx, ridgeY, w, h, "#1a1612");
  for (let i = cx; i < cx + w; i++) {
    const peak = ridgeY - Math.round((1 - Math.abs((i - cx - w / 2) / (w / 2))) * Math.min(5, 2 + w / 4));
    p.line(i, peak, i, ridgeY, i < cx + w / 2 ? "#2c241c" : "#221c16");
    p.set(i, peak, "#3a2e22");
  }
  if (lit) {
    lights.push({ x: cx + 2, y: ridgeY + 2, ph: hash(cx, ridgeY), k: 4 + (cx % 7) });
    if (w > 8) lights.push({ x: cx + w - 3, y: ridgeY + 2, ph: hash(cx + 3, ridgeY), k: 5 + (cx % 5) });
  }
}

function renderHills() {
  const p = painter(W, H);
  const r = rng(77);
  const ridge = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    ridge[i] =
      HOR -
      12 -
      10 * Math.sin(i * 0.016) -
      6 * Math.sin(i * 0.038 + 1.2) -
      4 * Math.sin(i * 0.08) -
      3 * Math.sin(i * 0.13 + 0.4) -
      (i > 360 ? (i - 360) * 0.08 : 0);
  }
  for (let i = 0; i < W; i++) {
    const top = Math.round(ridge[i]);
    for (let y = top; y < HOR + 8; y++) {
      const t = (y - top) / 24;
      let col = t < 0.25 ? "#161a1e" : t < 0.55 ? "#13181c" : t < 0.8 ? "#101418" : "#0e1216";
      if (((i * 13 + y * 7) & 7) === 0) col = "#1a1e22";
      p.set(i, y, col);
    }
  }
  const farLeaf = ["#1a2216", "#151c12", "#10160e"];
  for (let n = 0; n < 26; n++) {
    const x = 8 + Math.floor(r() * 332);
    const y = Math.round(ridge[x]) - 5 - Math.floor(r() * 4);
    const s = 6 + Math.floor(r() * 5);
    for (let k = 0; k < s; k++) {
      const u = k / s;
      const w = Math.max(2, Math.round((1 - u * u) * (2.4 + s * 0.26)));
      p.rect(x - w, y + k, w * 2 + 1, 1, u < 0.22 ? farLeaf[0] : u < 0.55 ? farLeaf[1] : farLeaf[2]);
    }
  }
  for (const [cx, s] of [[30, 11], [68, 9], [108, 12], [152, 10], [198, 9], [244, 11], [286, 8], [324, 9]]) {
    const cy = HOR - 11 - (s - 8);
    for (let k = 0; k < s; k++) {
      const u = k / s;
      const w = Math.max(3, Math.round((1 - u * u * 0.82) * (3.2 + s * 0.2)));
      p.rect(cx - w, cy + k, w * 2 + 1, 1, u < 0.18 ? "#1c2618" : u < 0.5 ? "#161e14" : "#12180f");
    }
    p.rect(cx, cy + s - 1, 2, Math.max(1, HOR - (cy + s) + 1), "#1a1610");
  }
  const hamlet = [
    [8, 2, 10, 6, true],
    [22, 3, 11, 7, true],
    [38, 2, 9, 6, true],
    [54, 3, 11, 7, true],
    [72, 4, 13, 8, true],
    [94, 2, 10, 7, false],
    [118, 3, 12, 7, true],
    [134, 2, 8, 6, true],
    [148, 1, 9, 6, true],
    [162, 3, 10, 7, true],
    [176, 3, 14, 8, true],
    [194, 2, 8, 6, false],
    [204, 2, 10, 6, true],
    [216, 3, 9, 7, true],
    [228, 1, 12, 8, true],
    [240, 2, 9, 6, true],
    [252, 3, 9, 6, false],
    [262, 2, 10, 7, true],
    [274, 2, 13, 8, true],
    [286, 3, 9, 6, true],
    [298, 4, 10, 7, true],
    [310, 2, 10, 6, true],
    [322, 2, 11, 7, true],
    [334, 3, 8, 6, true],
    [344, 3, 8, 6, true],
    [356, 4, 11, 8, true],
  ];
  const lights = [];
  for (const [cx, drop, w, h, lit] of hamlet) {
    farCottage(p, cx, Math.round(ridge[cx]) + drop, w, h, lit, lights);
  }
  const steepleX = 248;
  const steepleY = Math.round(ridge[steepleX]) - 2;
  p.rect(steepleX, steepleY, 5, 12, "#2a241c");
  p.rect(steepleX + 1, steepleY - 7, 3, 7, "#c8c0b4");
  p.set(steepleX + 2, steepleY - 10, "#d8d0c4");
  p.set(steepleX + 2, steepleY - 12, "#e8e0d4");
  lights.push({ x: steepleX + 2, y: steepleY + 4, ph: 0.4, k: 6 });

  for (const px of [108, 132, 158, 186, 222, 266, 304]) {
    const y = HOR - 2;
    p.rect(px, y, 26, 2, "#1a1814");
    for (let k = 0; k < 5; k++) p.rect(px + 2 + k * 5, y, 2, 5, "#141210");
  }

  for (let n = 0; n < 40; n++) {
    const x = 12 + Math.floor(r() * 350);
    const y = Math.round(ridge[x]) + 2 + Math.floor(r() * 8);
    lights.push({ x, y, ph: r(), k: 3 + Math.floor(r() * 9) });
  }
  const sheet = p.done();
  return { sheet, lights };
}

/* ================= Lighthouse + spit ================= */
function renderSpit() {
  const p = painter(W, H);
  for (let i = 368; i < W; i++) {
    const rise = Math.max(0, (i - 388) * 0.2);
    const top = QUAY - 10 - rise;
    for (let y = Math.round(top); y < QUAY + 14; y++) {
      const wet = y > QUAY - 2;
      let col = wet ? "#2a2824" : ((i + y) & 3) === 0 ? "#4a463c" : "#3a3830";
      if (hash(i, y, 3) > 0.78) col = "#524e44";
      if (hash(i, y, 9) > 0.9) col = "#2c2a24";
      if (hash(i, y, 5) > 0.96) col = "#6a6458";
      p.set(i, y, col);
    }
  }
  for (let k = 0; k < 18; k++) {
    const x = 372 + k * 6;
    const y = QUAY - 5 + (k & 1);
    p.rect(x, y, 4, 3, "#2e2c28");
    p.set(x + 1, y - 1, "#3a3832");
    p.set(x + 2, y + 1, "#1c1a16");
  }
  p.rect(378, 188, 8, 6, "#2a2620");
  p.rect(378, 186, 8, 2, "#3a342c");
  p.rect(388, 176, 22, 22, "#2a2620");
  shakeWall(p, 388, 180, 22, 18, "#221e18", "#2c2820", "#3a342c");
  for (let i = 386; i < 412; i++) {
    const y = 174 - Math.round((1 - Math.abs((i - 399) / 13)) * 6);
    p.line(i, y, i, 180, i < 399 ? "#4a4034" : "#3a3428");
    p.set(i, y, "#5a4e3e");
  }
  p.rect(404, 168, 4, 10, "#3a3428");
  p.rect(403, 166, 6, 3, "#2a241c");
  windowPane(p, 394, 184, false);
  windowPane(p, 394, 172, false);
  p.rect(386, 198, 26, 1, "#4a4438");
  for (let x = 388; x < 410; x += 4) p.rect(x, 194, 1, 4, "#3a342c");
  p.rect(412, 186, 14, 16, "#2c2820");
  shakeWall(p, 412, 190, 14, 12, "#221e18", "#2c2820", "#3a342c");
  for (let i = 410; i < 428; i++) {
    const y = 184 - Math.round((1 - Math.abs((i - 419) / 9)) * 5);
    p.line(i, y, i, 190, i < 419 ? "#4a4034" : "#3a3428");
    p.set(i, y, "#5a4e3e");
  }
  windowPane(p, 415, 192, false);
  p.rect(448, 188, 10, 8, "#2a2620");
  p.rect(448, 186, 10, 2, "#3a342c");
  p.rect(450, 190, 3, 4, "#1c1a16");
  for (let k = 0; k < 8; k++) {
    const x = 430 + k * 5;
    p.rect(x, QUAY - 4 + (k & 1), 3, 2, "#3a3830");
    p.set(x + 1, QUAY - 5 + (k & 1), "#524e44");
  }
  return p.done();
}

function renderLighthouse() {
  const p = painter(W, H);
  const cx = LIGHT.cx;
  const base = LIGHT.base;
  const lantern = LIGHT.lantern;
  p.rect(cx - 10, base - 8, 20, 10, "#3c3a34");
  p.rect(cx - 8, lantern + 8, 16, base - lantern - 16, "#d8d2c4");
  for (let y = lantern + 8; y < base - 8; y++) {
    if ((y - lantern) % 14 === 0) p.rect(cx - 8, y, 16, 1, "#b8b0a4");
    if (((y + cx) & 3) === 0) p.set(cx - 8, y, "#c8c0b4");
    p.set(cx + 7, y, "#9a9488");
  }
  p.rect(cx - 9, lantern + 6, 18, 3, "#2a2824");
  p.rect(cx - 6, lantern - 2, 12, 9, "#1a1814");
  p.rect(cx - 4, lantern, 8, 5, "#ffe8a0");
  p.set(cx - 1, lantern + 1, "#fff8dc");
  p.set(cx + 1, lantern + 2, "#fff8dc");
  p.rect(cx - 7, lantern - 6, 14, 4, "#8a2018");
  p.set(cx, lantern - 7, "#6a1814");
  p.rect(cx - 1, lantern - 10, 2, 4, "#2a2824");
  p.rect(cx - 11, lantern + 10, 4, 2, "#d0c8bc");
  p.rect(cx + 7, lantern + 10, 4, 2, "#d0c8bc");
  p.rect(cx - 3, base - 18, 3, 5, "#1c1a16");
  p.set(cx - 2, base - 16, "#f0c878");
  p.rect(cx - 3, base - 36, 3, 5, "#1c1a16");
  p.set(cx - 2, base - 34, "#f0c878");
  p.rect(cx - 2, base - 10, 4, 8, "#2a241c");
  p.set(cx, base - 6, "#c89040");
  p.rect(cx - 9, lantern + 12, 18, 1, "#8a8074");
  for (let x = cx - 8; x < cx + 8; x += 3) p.set(x, lantern + 12, "#d0c8bc");
  p.rect(cx - 8, lantern + 8, 16, 1, "#f4e8c0");
  p.rect(cx - 9, lantern + 4, 18, 1, "#8a2018");
  return p.done();
}

/* ================= Village shacks ================= */
function shakeWall(p, x0, y0, w, h, dark, mid, lite) {
  for (let y = y0; y < y0 + h; y++) {
    for (let i = x0; i < x0 + w; i++) {
      const row = Math.floor((y - y0) / 3);
      const odd = row & 1;
      const col = ((i + odd * 2) % 5 === 0) ? dark : ((i + y) & 2 ? mid : lite);
      p.set(i, y, hash(i, y, 4) > 0.9 ? dark : col);
    }
  }
}

function windowPane(p, x, y, lit) {
  p.rect(x, y, 7, 8, "#1a1610");
  if (lit) {
    p.rect(x + 1, y + 1, 2, 2, "#ffe8a8");
    p.rect(x + 4, y + 1, 2, 2, "#f4d078");
    p.rect(x + 1, y + 4, 2, 3, "#e8b050");
    p.rect(x + 4, y + 4, 2, 3, "#d49838");
    p.set(x + 2, y + 2, "#fff6d0");
  } else {
    p.rect(x + 1, y + 1, 5, 6, "#141820");
  }
  p.rect(x + 3, y, 1, 8, "#2a2418");
  p.rect(x, y + 3, 7, 1, "#2a2418");
}

function clapboard(p, x0, y0, w, h, dark, mid, lite) {
  for (let y = y0; y < y0 + h; y++) {
    const stripe = ((y - y0) & 1) === 0;
    for (let i = x0; i < x0 + w; i++) {
      p.set(i, y, hash(i, y, 5) > 0.94 ? dark : stripe ? mid : lite);
    }
  }
  p.rect(x0, y0, 1, h, lite);
  p.rect(x0 + w - 1, y0, 1, h, dark);
}

function brickBond(p, x0, y0, w, h, dark, mid, lite) {
  for (let y = y0; y < y0 + h; y++) {
    const row = Math.floor((y - y0) / 2);
    const odd = row & 1;
    for (let i = x0; i < x0 + w; i++) {
      const mortar = ((y - y0) & 1) === 0 || ((i + odd * 2) % 4 === 0);
      p.set(i, y, mortar ? dark : ((i + odd + row) & 2 ? mid : lite));
    }
  }
}

function ashlar(p, x0, y0, w, h, dark, mid, lite) {
  for (let y = y0; y < y0 + h; y++) {
    for (let i = x0; i < x0 + w; i++) {
      const mortar = ((i - x0) % 5 === 0) || ((y - y0) % 3 === 0);
      const block = Math.floor((i - x0) / 5) + Math.floor((y - y0) / 3);
      p.set(i, y, mortar ? dark : (block & 1 ? mid : lite));
    }
  }
}

function cornice(p, x, y, w) {
  p.rect(x - 1, y, w + 2, 1, "#c8b89a");
  p.rect(x, y + 1, w, 1, "#3a3228");
}

function gable(p, x0, x1, eavesY, peakH, leftCol, rightCol, ridgeCol) {
  const mid = (x0 + x1) / 2;
  const hw = Math.max(1, (x1 - x0) / 2);
  for (let i = x0; i < x1; i++) {
    const y = eavesY - Math.round((1 - Math.abs((i - mid) / hw)) * peakH);
    p.line(i, y, i, eavesY, i < mid ? leftCol : rightCol);
    p.set(i, y, ridgeCol);
  }
}

function chimney(p, x, y, h, brick) {
  p.rect(x, y, 5, h, brick ? "#6a3a32" : "#4a4438");
  p.rect(x - 1, y, 7, 2, brick ? "#5a3028" : "#3a342c");
  p.set(x + 1, y - 1, "#2a241c");
}

function sash(p, x, y, lit, w = 5, h = 7) {
  p.rect(x, y, w, h, "#1a1610");
  p.rect(x + 1, y + 1, w - 2, h - 2, lit ? "#ffe8a8" : "#141820");
  p.rect(x + (w >> 1), y, 1, h, "#2a2418");
  p.rect(x, y + (h >> 1), w, 1, "#2a2418");
}

function storefront(p, x, y, w, h) {
  p.rect(x, y, w, h, "#1a1610");
  p.rect(x + 1, y + 1, w - 2, h - 2, "#141820");
  p.rect(x + (w >> 1), y, 1, h, "#2a2418");
  p.rect(x, y + 3, w, 1, "#2a2418");
  p.rect(x - 1, y - 2, w + 2, 2, "#3a3228");
}

function stoop(p, x, y, w) {
  p.rect(x, y, w, 2, "#6a6458");
  p.rect(x + 1, y + 2, w - 2, 2, "#5a5448");
}

function column(p, x, y, h) {
  p.rect(x, y, 2, h, "#ece4d8");
  p.rect(x - 1, y, 4, 2, "#f4ece0");
  p.rect(x - 1, y + h - 2, 4, 2, "#d8d0c4");
}

function palings(p, x0, x1, y) {
  p.rect(x0, y, x1 - x0, 1, "#3a3830");
  for (let x = x0; x < x1; x += 3) p.rect(x, y, 1, 5, "#2a2824");
}

function streetTree(p, cx, base, h) {
  p.rect(cx, base - Math.floor(h * 0.42), 2, Math.floor(h * 0.42), "#2a2218");
  const top = base - h;
  const s = Math.floor(h * 0.6);
  for (let k = 0; k < s; k++) {
    const u = k / s;
    const w = Math.max(2, Math.round((1 - u * u) * (h * 0.2)));
    p.rect(cx - w + 1, top + k, w * 2, 1, u < 0.2 ? "#24301c" : u < 0.55 ? "#1c2818" : "#162012");
  }
}

function paintMaxwell(p) {
  brickBond(p, 8, 168, 28, 36, "#4a2c26", "#6a3a32", "#7a4840");
  gable(p, 7, 37, 168, 18, "#5a3028", "#4a2820", "#3a2018");
  chimney(p, 19, 146, 14, true);
  cornice(p, 8, 167, 28);
  sash(p, 11, 174, false);
  sash(p, 24, 174, false);
  sash(p, 11, 188, false);
  sash(p, 24, 188, false);
  p.rect(18, 190, 7, 14, "#1c1610");
  p.rect(19, 191, 5, 4, "#141820");
  stoop(p, 16, 202, 11);
}

function paintTownHall(p) {
  brickBond(p, 38, 108, 14, 96, "#4a2824", "#6a3830", "#7a443c");
  cornice(p, 38, 122, 14);
  cornice(p, 38, 154, 14);
  p.rect(40, 104, 10, 5, "#2a5848");
  for (let i = 40; i < 50; i++) {
    const y = 96 - Math.round((1 - Math.abs((i - 45) / 5)) * 8);
    p.line(i, y, i, 104, i < 45 ? "#3a6a58" : "#2a5848");
    p.set(i, y, "#4a8a70");
  }
  p.rect(44, 88, 2, 8, "#2a4038");
  p.set(44, 86, "#4a8a70");
  sash(p, 42, 128, false, 6, 8);
  sash(p, 42, 160, false, 6, 8);
  sash(p, 42, 184, false, 6, 8);
  brickBond(p, 50, 148, 24, 56, "#4a2824", "#6a3830", "#7a443c");
  p.rect(50, 142, 24, 6, "#3a4038");
  gable(p, 50, 74, 142, 6, "#4a5048", "#3a4038", "#2a3028");
  cornice(p, 50, 147, 24);
  chimney(p, 66, 134, 12, true);
  sash(p, 54, 156, false);
  sash(p, 64, 156, false);
  sash(p, 54, 170, false);
  sash(p, 64, 170, false);
  sash(p, 54, 184, false);
  sash(p, 64, 184, false);
  p.rect(58, 190, 7, 14, "#1c1610");
  p.rect(59, 191, 5, 3, "#141820");
  stoop(p, 56, 202, 11);
}

function paintMethodist(p) {
  clapboard(p, 74, 158, 40, 46, "#8a8278", "#c8c0b4", "#dcd4c8");
  cornice(p, 74, 157, 40);
  gable(p, 74, 114, 158, 14, "#e8e0d4", "#d0c8bc", "#f0e8dc");
  p.rect(79, 168, 30, 32, "#b0a898");
  p.rect(78, 200, 32, 4, "#d8d0c4");
  column(p, 80, 168, 34);
  column(p, 88, 168, 34);
  column(p, 96, 168, 34);
  column(p, 104, 168, 34);
  p.rect(92, 184, 8, 18, "#2a241c");
  p.rect(94, 186, 4, 6, "#141820");
  p.set(98, 196, "#c89040");
  stoop(p, 90, 202, 12);
  palings(p, 74, 80, 198);
  palings(p, 114, 118, 198);
  sash(p, 76, 170, false);
  sash(p, 76, 184, false);
  sash(p, 108, 170, false);
  sash(p, 108, 184, false);
  const sx = 89;
  p.rect(sx, 128, 12, 30, "#e0d8cc");
  p.rect(sx + 1, 132, 3, 5, "#1a1610");
  p.rect(sx + 7, 132, 3, 5, "#1a1610");
  cornice(p, sx, 127, 12);
  p.rect(sx + 1, 114, 10, 14, "#ece4d8");
  p.rect(sx + 3, 118, 3, 6, "#1a1610");
  p.rect(sx + 7, 118, 3, 6, "#1a1610");
  cornice(p, sx + 1, 113, 10);
  p.rect(sx + 2, 102, 8, 12, "#e8e0d4");
  p.rect(sx + 4, 106, 4, 5, "#1a1610");
  for (let i = sx + 2; i < sx + 10; i++) {
    const y = 62 - Math.round((1 - Math.abs((i - (sx + 6)) / 4)) * 40);
    p.line(i, y, i, 102, i < sx + 6 ? "#f0e8dc" : "#d8d0c4");
    p.set(i, y, "#fff8f0");
  }
  p.rect(sx + 5, 54, 2, 8, "#d8d0c4");
  p.set(sx + 5, 52, "#fff8f0");
}

function paintLibrary(p) {
  ashlar(p, 116, 164, 24, 40, "#3a3830", "#5a5850", "#6a6860");
  cornice(p, 116, 163, 24);
  gable(p, 116, 140, 164, 10, "#4a4840", "#3a3830", "#7a7870");
  ashlar(p, 138, 128, 10, 76, "#3a3830", "#5a5850", "#6a6860");
  for (let i = 138; i < 148; i++) {
    const y = 108 - Math.round((1 - Math.abs((i - 143) / 5)) * 20);
    p.line(i, y, i, 128, i < 143 ? "#6a6860" : "#4a4840");
    p.set(i, y, "#8a8878");
  }
  p.set(142, 104, "#7a7870");
  sash(p, 120, 172, false);
  sash(p, 130, 172, false);
  sash(p, 120, 186, false);
  p.rect(128, 190, 7, 14, "#1c1610");
  stoop(p, 126, 202, 11);
  palings(p, 116, 126, 198);
  p.rect(141, 140, 4, 10, "#1a1610");
  p.set(142, 138, "#1a1610");
}

function paintShops(p) {
  clapboard(p, 146, 154, 22, 50, "#6a5040", "#8a6a50", "#9a7a5c");
  cornice(p, 146, 153, 22);
  gable(p, 146, 168, 154, 8, "#5a4430", "#4a3828", "#6a5440");
  chimney(p, 160, 144, 12, true);
  sash(p, 150, 160, false);
  sash(p, 160, 160, false);
  sash(p, 150, 174, false);
  sash(p, 160, 174, false);
  storefront(p, 148, 188, 18, 14);
  p.rect(154, 192, 6, 12, "#1c1610");
  stoop(p, 152, 202, 10);

  clapboard(p, 166, 166, 20, 38, "#5a5448", "#8a8478", "#9a9488");
  cornice(p, 166, 165, 20);
  gable(p, 166, 186, 166, 7, "#4a4438", "#3a342c", "#5a5448");
  sash(p, 170, 172, false);
  sash(p, 178, 172, false);
  storefront(p, 168, 188, 16, 14);
  p.rect(172, 192, 6, 12, "#1c1610");
  chimney(p, 180, 156, 10, false);
}

function paintShed(p) {
  ashlar(p, 186, 178, 22, 26, "#2a2820", "#3a3830", "#4a4840");
  gable(p, 186, 208, 178, 8, "#4a4034", "#3a3428", "#5a5040");
  p.rect(194, 188, 8, 16, "#1a1410");
  sash(p, 188, 184, false, 5, 5);
  p.rect(186, 202, 22, 2, "#3a3428");
  p.rect(208, 198, 6, 6, "#2a2824");
}

function renderVillage() {
  const p = painter(W, H);
  for (let i = 0; i < 212; i++) {
    const top = QUAY - 4 - Math.round(2 * Math.sin(i * 0.2));
    for (let y = top; y < H; y++) {
      const col = y > QUAY + 8 ? "#1a1612" : ((i + y) & 2 ? "#2c241c" : "#32281e");
      p.set(i, y, col);
    }
  }
  p.rect(0, 204, 210, 1, "#5a5448");
  streetTree(p, 4, 204, 42);
  streetTree(p, 156, 204, 36);
  paintMaxwell(p);
  paintTownHall(p);
  paintMethodist(p);
  paintLibrary(p);
  paintShops(p);
  paintShed(p);

  p.rect(4, 210, 10, 3, "#8a2820");
  p.rect(5, 207, 8, 3, "#c44030");
  p.rect(198, 206, 8, 3, "#7a2018");
  p.rect(199, 203, 6, 3, "#c44030");
  p.rect(202, 208, 8, 8, "#4a3a28");
  p.rect(203, 209, 6, 6, "#2a2018");
  for (let k = 0; k < 6; k++) {
    p.rect(188 + k * 4, 208, 4, 5, "#3a3226");
    p.set(189 + k * 4, 209, "#4a4030");
  }

  const sheet = p.done();
  const sx = sheet.getContext("2d");
  sx.imageSmoothingEnabled = false;
  text(sx, "BAIT", 148, 156, "#c8b090");
  text(sx, "ICE", 168, 168, "#a09078");
  text(sx, "COAL", 188, 180, "#a09078");
  return sheet;
}

function renderTraps() {
  const trap = sprite(
    [
      "......",
      ".oooo.",
      "o....o",
      "o.xx.o",
      "o....o",
      ".oooo.",
      "..nn..",
    ],
    { o: "#3a3428", x: "#2a241c", n: "#4a4034" },
  );
  const [c, x] = makeCanvas(64, 32);
  x.drawImage(trap, 2, 8);
  x.drawImage(trap, 10, 6);
  x.drawImage(trap, 18, 10);
  x.drawImage(trap, 8, 14);
  x.drawImage(trap, 16, 16);
  x.drawImage(trap, 24, 12);
  x.drawImage(trap, 32, 14);
  x.drawImage(trap, 28, 8);
  x.drawImage(trap, 40, 10);
  return c;
}

function renderCoil() {
  return sprite(
    [
      "......",
      "..oo..",
      ".o..o.",
      "o.oo.o",
      ".o..o.",
      "..oo..",
    ],
    { o: "#6a5438" },
  );
}

function renderBarrel() {
  return sprite(
    [
      ".xxxx.",
      "x....x",
      "xxxxxx",
      "x....x",
      "xxxxxx",
      "x....x",
      ".xxxx.",
    ],
    { x: "#5a4030" },
  );
}

function renderDock() {
  const p = painter(W, H);
  for (let i = 64; i < 324; i++) {
    const y0 = DECK;
    for (let y = y0; y < y0 + 16; y++) {
      const plank = Math.floor((i - 64) / 6);
      const gap = (i - 64) % 6 === 5;
      let col = gap ? "#1a1410" : plank & 1 ? "#4a3a28" : "#3e3222";
      if (!gap && hash(i, y, 5) > 0.86) col = "#524030";
      if (!gap && hash(i, y, 8) > 0.93) col = "#6a5840";
      if (y > y0 + 12) col = "#2a2018";
      if (!gap && y === y0 + 1) col = "#5a4a34";
      if (!gap && y === y0 + 2 && hash(i, y, 2) > 0.7) col = "#7a6848";
      p.set(i, y, col);
    }
  }
  for (let x = 80; x < 316; x += 16) {
    p.rect(x, DECK + 14, 4, 34, "#2a2218");
    p.rect(x + 1, DECK + 14, 2, 34, "#3a2e20");
    p.rect(x - 1, QUAY + 22, 6, 3, "#1c1814");
    p.rect(x, QUAY + 8, 1, 12, "#1a1410");
    p.rect(x + 3, QUAY + 10, 1, 8, "#14100c");
  }
  p.rect(72, DECK - 1, 248, 1, "#6a5840");
  for (let x = 86; x < 310; x += 14) {
    p.rect(x, DECK - 8, 1, 8, "#3a3228");
    p.rect(x - 4, DECK - 9, 9, 1, "#4a4034");
  }
  for (const bx of [90, 128, 168, 210, 248, 286]) {
    p.rect(bx, DECK - 3, 3, 4, "#2a241c");
    p.rect(bx + 1, DECK - 4, 1, 1, "#4a4034");
    p.line(bx + 1, DECK, bx + 8, DECK + 6, "#4a4034");
  }
  p.rect(300, DECK - 20, 20, 20, "#2a2218");
  shakeWall(p, 300, DECK - 16, 20, 16, "#241c16", "#32281e", "#3c3024");
  for (let i = 298; i < 322; i++) {
    const y = DECK - 22 - Math.round((1 - Math.abs((i - 310) / 12)) * 5);
    p.line(i, y, i, DECK - 16, "#3a2e22");
    p.set(i, y, "#4a3c2c");
  }
  windowPane(p, 306, DECK - 14, false);
  p.rect(318, DECK - 4, 6, 4, "#3a3228");
  p.rect(72, DECK - 6, 8, 6, "#3a3228");
  p.rect(73, DECK - 5, 6, 4, "#2a241c");
  for (let x = 74; x < 310; x += 22) {
    p.rect(x, DECK + 8, 3, 3, "#1a1410");
    p.rect(x - 1, DECK + 10, 5, 2, "#241c16");
  }
  p.rect(232, DECK - 16, 14, 16, "#2a2218");
  shakeWall(p, 232, DECK - 12, 14, 12, "#241c16", "#32281e", "#3c3024");
  for (let i = 230; i < 248; i++) {
    const y = DECK - 18 - Math.round((1 - Math.abs((i - 239) / 9)) * 4);
    p.line(i, y, i, DECK - 12, "#3a2e22");
    p.set(i, y, "#4a3c2c");
  }
  windowPane(p, 235, DECK - 12, false);
  p.rect(152, DECK - 1, 48, 1, "#5a4a34");
  for (let i = 0; i < 10; i++) p.rect(154 + i * 5, DECK, 2, 8 + (i & 1) * 2, "#2a2218");
  return p.done();
}

function renderNet() {
  return sprite(
    [
      "n.n.n.n",
      ".n.n.n.",
      "n.n.n.n",
      ".n.n.n.",
      "n.n.n.n",
    ],
    { n: "#4a4034" },
  );
}

function renderCrate() {
  return sprite(
    [
      "........",
      ".xxxxxx.",
      "x......x",
      "x.xxxx.x",
      "x......x",
      ".xxxxxx.",
    ],
    { x: "#5a4830" },
  );
}

/* ================= Boats ================= */
function renderSmallLobster(flip = false) {
  return sprite(
    [
      ".............",
      "......www....",
      ".....wgggw...",
      ".....wgygw...",
      "....wwwww....",
      "...w......w..",
      "..hhhhhhhhh..",
      ".hbbbbbbbbbh.",
      ".bbbbbbbbbbb.",
      "..nnnnnnnnn..",
    ],
    {
      w: "#e4dcc8",
      g: "#3a5040",
      y: "#f0c878",
      h: "#c8b090",
      b: "#b8a078",
      n: "#243038",
    },
    flip,
  );
}

function renderSail(flip = false) {
  return sprite(
    [
      "......m......",
      ".....m.s.....",
      "....m..ss....",
      "...m...sss...",
      "..m....ssss..",
      ".m.....sssss.",
      "m......ssssss",
      "m.wwwwwwsss..",
      ".hbbbbbbbbh..",
      "..nnnnnnnn...",
    ],
    {
      m: "#3a3228",
      s: "#f2eee4",
      w: "#d8d0c4",
      h: "#c0b8ac",
      b: "#a89880",
      n: "#243038",
    },
    flip,
  );
}

function renderCatboat(flip = false) {
  return sprite(
    [
      "....m........",
      "...mss.......",
      "..m.sss......",
      ".m..ssss.....",
      "m...sssss....",
      "mwwwwwwsss...",
      ".hbbbbbbbh...",
      "..nnnnnnn....",
    ],
    {
      m: "#2a241c",
      s: "#e8dcc4",
      w: "#c8b090",
      h: "#a89070",
      b: "#8a7458",
      n: "#243038",
    },
    flip,
  );
}

function renderLobsterBoat(flip = false) {
  return sprite(
    [
      "................",
      ".......www......",
      "......wcccw.....",
      "......wcycw.....",
      ".....wwwww......",
      "....w.....w.....",
      "...w.......ww...",
      "..hhhhhhhhhhhh..",
      ".hbbbbbbbbbbbbh.",
      ".bbbbbbbbbbbbbb.",
      "..nnnnnnnnnnnn..",
    ],
    {
      w: "#e8e0d4",
      c: "#2c2830",
      y: "#f0c878",
      h: "#d0c8bc",
      b: "#c8c0b4",
      n: "#2a3238",
    },
    flip,
  );
}

function renderSkiff() {
  return sprite(
    [
      "...........",
      "..wwwwww...",
      ".w......w..",
      "hbbbbbbbbh.",
      ".nnnnnnnn..",
    ],
    { w: "#c8b090", b: "#a89070", h: "#8a7458", n: "#243038" },
  );
}

function renderFerry() {
  return sprite(
    [
      "..................",
      "......wwww........",
      ".....wccccw.......",
      "....wwwwwwww......",
      "...w........w.....",
      "..hhhhhhhhhhhhh...",
      ".hbbbbbbbbbbbbbh..",
      ".bbbbbbbbbbbbbbb..",
      "..nnnnnnnnnnnnn...",
    ],
    {
      w: "#d8d0c4",
      c: "#2a3040",
      h: "#c0b8ac",
      b: "#b0a898",
      n: "#1c2830",
    },
  );
}

function renderGullFly(frame, flip = false) {
  const ink = { w: "#ece8e0", t: "#c8c4bc" };
  const rows = [
    [
      ".w.....w.",
      "w..www..w",
      "...www...",
      "....t....",
    ],
    [
      ".........",
      "ww.www.ww",
      "...www...",
      "....t....",
    ],
    [
      ".........",
      "...www...",
      ".w..t..w.",
      "..w...w..",
    ],
  ][frame];
  return sprite(rows, ink, flip);
}

function renderGullPerch() {
  return sprite(
    [
      ".www.",
      ".www.",
      "..t..",
    ],
    { w: "#ece8e0", t: "#c8c4bc" },
  );
}

function flapFrame(t, ph, rate) {
  const u = frac((t * rate) / LOOP + ph);
  if (u < 0.28) return 0;
  if (u < 0.52) return 1;
  if (u < 0.76) return 2;
  return 1;
}

function renderWalker(frame, flip) {
  const rows = [
    [
      "..11.",
      ".1111",
      "..11.",
      ".111.",
      "1.1.1",
      "..1..",
      ".1.1.",
      "1...1",
    ],
    [
      "..11.",
      ".1111",
      "..11.",
      ".111.",
      "1.1.1",
      "..1..",
      "..11.",
      ".1..1",
    ],
    [
      "..11.",
      ".1111",
      "..11.",
      ".111.",
      "1.1.1",
      "..1..",
      ".1.1.",
      "1...1",
    ],
    [
      "..11.",
      ".1111",
      "..11.",
      ".111.",
      "1.1.1",
      "..1..",
      ".11..",
      "1..1.",
    ],
  ][frame];
  return sprite(rows, { 1: "#141210" }, flip);
}

function renderCat() {
  return sprite(
    [
      ".o...o",
      ".oooo.",
      "o.o.oo",
      ".oooo.",
      ".o..o.",
    ],
    { o: "#1a1814" },
  );
}

function renderBuoy() {
  return sprite(
    [
      "..w.",
      ".rr.",
      "rrrr",
      ".nn.",
    ],
    { w: "#e8e0d0", r: "#c44030", n: "#2a2824" },
  );
}

function renderVignette() {
  const [c, x] = makeCanvas(W, H);
  const img = x.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let i = 0; i < W; i++) {
      const vx = (i / W) * 2 - 1;
      const vy = (y / H) * 2 - 1;
      const a = Math.pow(Math.max(0, Math.hypot(vx * 0.85, vy * 0.95) - 0.55), 1.6) * 0.55;
      if (a <= 0) continue;
      const o = (y * W + i) * 4;
      d[o] = 8;
      d[o + 1] = 6;
      d[o + 2] = 4;
      d[o + 3] = Math.round(clamp(a, 0, 1) * 255);
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* ================= Prerender ================= */
let MOON_C, SUN_C, HILLS, SPIT_C, LIGHT_C, VILLAGE_C, DOCK_C, TRAPS_C, CRATE_C, COIL_C, BARREL_C;
let LOBSTER_C, LOBSTER_L, LOBSTER_S, LOBSTER_SL, SKIFF_C, FERRY_C, BUOY_C, CAT_C, NET_C, VIG_C;
let SAIL_R, SAIL_L, CATBOAT_R, CATBOAT_L;
let HILLS_DAY, SPIT_DAY, LIGHT_DAY, VILLAGE_DAY, DOCK_DAY;
let GULL_R, GULL_L, GULL_SIT, WALK_R, WALK_L;
let HALO_MOON, HALO_SUN, HALO_WIN, HALO_LAMP, HALO_BEAM, HALO_BUOY, HALO_WARM;

function prerender() {
  MOON_C = renderMoon();
  SUN_C = renderSun();
  HILLS = renderHills();
  SPIT_C = renderSpit();
  LIGHT_C = renderLighthouse();
  VILLAGE_C = renderVillage();
  DOCK_C = renderDock();
  const dayWash = "rgba(214, 196, 140, 0.42)";
  HILLS_DAY = tintSheet(HILLS.sheet, dayWash);
  SPIT_DAY = tintSheet(SPIT_C, dayWash);
  LIGHT_DAY = tintSheet(LIGHT_C, "rgba(220, 210, 180, 0.28)");
  VILLAGE_DAY = tintSheet(VILLAGE_C, dayWash);
  DOCK_DAY = tintSheet(DOCK_C, "rgba(210, 190, 140, 0.32)");
  TRAPS_C = renderTraps();
  CRATE_C = renderCrate();
  COIL_C = renderCoil();
  BARREL_C = renderBarrel();
  LOBSTER_C = renderLobsterBoat(false);
  LOBSTER_L = renderLobsterBoat(true);
  LOBSTER_S = renderSmallLobster(false);
  LOBSTER_SL = renderSmallLobster(true);
  SAIL_R = renderSail(false);
  SAIL_L = renderSail(true);
  CATBOAT_R = renderCatboat(false);
  CATBOAT_L = renderCatboat(true);
  SKIFF_C = renderSkiff();
  FERRY_C = renderFerry();
  BUOY_C = renderBuoy();
  CAT_C = renderCat();
  NET_C = renderNet();
  VIG_C = renderVignette();
  GULL_R = [0, 1, 2].map((f) => renderGullFly(f, false));
  GULL_L = [0, 1, 2].map((f) => renderGullFly(f, true));
  GULL_SIT = renderGullPerch();
  WALK_R = [0, 1, 2, 3].map((f) => renderWalker(f, false));
  WALK_L = [0, 1, 2, 3].map((f) => renderWalker(f, true));
  HALO_MOON = makeHalo(26, "#f0ece0", 0.32, 1.6, 6);
  HALO_SUN = makeHalo(28, "#ffe08a", 0.45, 1.5, 6);
  HALO_WIN = makeHalo(16, "#f4c878", 0.68, 1.7, 6);
  HALO_LAMP = makeHalo(20, "#f4d078", 0.74, 1.6, 6);
  HALO_BEAM = makeHalo(40, "#f8e8b0", 0.42, 2.1, 6);
  HALO_BUOY = makeHalo(7, "#e05040", 0.55, 1.6, 4);
  HALO_WARM = makeHalo(16, "#e8a048", 0.35, 1.8, 5);
}

/* ================= Frame ================= */
function drawStars(t) {
  if (SKY.night < 0.2) return;
  ctx.fillStyle = "#e8e4d8";
  const moonP = bodyProject(SKY.moon);
  const sunP = bodyProject(SKY.sun);
  for (const s of STARS) {
    if (SKY.moon.alt > 0 && Math.hypot(s.x - moonP.x, s.y - moonP.y) < 16) continue;
    if (SKY.sun.alt > -6 && Math.hypot(s.x - sunP.x, s.y - sunP.y) < 20) continue;
    const a = s.b * SKY.night * (0.45 + 0.55 * (0.5 + 0.5 * wave(t, s.k, s.ph)));
    if (a < 0.18) continue;
    ctx.globalAlpha = a;
    ctx.fillRect(s.x, s.y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawClouds(t) {
  const fade = 0.35 + 0.65 * SKY.night + 0.25 * SKY.twilight;
  ctx.globalAlpha = fade;
  for (const layer of CLOUDS) {
    const ox = scroll(t, layer.k, W);
    ctx.drawImage(layer.c, ox - W, layer.y);
    ctx.drawImage(layer.c, ox, layer.y);
  }
  ctx.globalAlpha = 1;
}

function drawHills(t) {
  ctx.drawImage(HILLS.sheet, 0, 0);
  if (SKY.day > 0.04) {
    ctx.globalAlpha = SKY.day;
    ctx.drawImage(HILLS_DAY, 0, 0);
    ctx.globalAlpha = 1;
  }
  if (SKY.night < 0.18) return;
  for (const L of HILLS.lights) {
    const on = SKY.night * (0.55 + 0.45 * (0.5 + 0.5 * wave(t, L.k, L.ph)));
    if (on < 0.4) continue;
    ctx.globalAlpha = on;
    ctx.fillStyle = "#e8c878";
    ctx.fillRect(L.x, L.y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawWater(t) {
  const palN = [
    "#081018", "#0c1620", "#101c28", "#142230", "#1a2a38",
    "#203040", "#263848", "#2c4050", "#344858", "#3a5060",
  ].map(hex);
  const palD = [
    "#3a7088", "#448098", "#4e8ca4", "#5898b0", "#62a4b8",
    "#6cacbe", "#76b4c4", "#80bccc", "#8ac0ce", "#94c4d0",
  ].map(hex);
  const pal = mixPalette(palN, palD, SKY.day);
  const bottom = QUAY + 24;
  for (let y = HOR; y < bottom; y++) {
    const depth = (y - HOR) / (bottom - HOR);
    const k = Math.min(pal.length - 1, Math.floor(depth * pal.length));
    const col = pal[k];
    ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = SKY.day > 0.5 ? "#d8e8f0" : "#3a5868";
    ctx.globalAlpha = 0.14 + 0.12 * wave(t, 17, y * 0.02);
    const ox = Math.round(wave(t, 9, y * 0.03) * (1 + depth * 3));
    for (let i = (y * 3) % 8; i < W; i += 8) ctx.fillRect(i + ox, y, 2, 1);
    ctx.fillStyle = SKY.day > 0.5 ? "#8ab0c0" : "#1a3038";
    ctx.globalAlpha = 0.12;
    const ox2 = Math.round(wave(t, 13, y * 0.05) * (1 + depth));
    for (let i = (y * 5) % 11; i < W; i += 11) ctx.fillRect(i + ox2, y, 3, 1);
    ctx.fillStyle = "#8aa0a8";
    ctx.globalAlpha = 0.06 + 0.05 * wave(t, 21, y * 0.07);
    const ox3 = Math.round(wave(t, 5, y * 0.08) * (1 + depth * 2));
    for (let i = (y * 7) % 17; i < W; i += 17) ctx.fillRect(i + ox3, y, 1, 1);
  }
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#6a5840";
  for (let y = QUAY; y < QUAY + 10; y++) {
    const foam = Math.round(wave(t, 15, y * 0.1) * 2);
    ctx.fillRect(64 + foam, y, 260, 1);
  }
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = SKY.day > 0.5 ? "#c8dce4" : "#8aa0a8";
  for (let y = HOR + 6; y < QUAY - 4; y += 3) {
    const ox = Math.round(wave(t, 7, y * 0.06) * 4);
    ctx.fillRect((y * 13 + ox) % W, y, 6 + (y % 5), 1);
  }
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = SKY.day > 0.5 ? "#d0e4ec" : "#5a7068";
  for (let i = 0; i < 18; i++) {
    const x = 70 + i * 18 + Math.round(wave(t, 11, i * 0.1) * 2);
    const y = QUAY - 2 + Math.round(wave(t, 9, i * 0.17));
    ctx.fillRect(x, y, 3, 1);
  }
  ctx.globalAlpha = 1;
  const body = SKY.day > 0.35 && SKY.sun.alt > 0 ? SKY.sun : SKY.moon;
  if (body.alt > 0) {
    const p = bodyProject(body);
    const pathY0 = HOR + 1;
    for (let y = pathY0; y < QUAY - 2; y++) {
      const u = (y - pathY0) / (QUAY - pathY0);
      const w = 2 + Math.round(u * 16);
      const ox = Math.round(wave(t, 11, y * 0.04) * (1 + u * 2));
      ctx.globalAlpha = (SKY.day > 0.35 ? 0.22 : 0.16) * (1 - u);
      ctx.fillStyle = SKY.day > 0.35 ? "#f4e8c0" : "#d8e4ec";
      ctx.fillRect(Math.round(p.x) - Math.floor(w / 2) + ox, y, w, 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawBeam(t) {
  if (SKY.night < 0.35) return;
  const ang = TAU * (t / LOOP) * 8;
  const len = 132;
  const x0 = LIGHT.cx;
  const y0 = LIGHT.lantern + 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < 36; k++) {
    const u = k / 36;
    const spread = 0.28 + u * 0.7;
    const x = x0 + Math.cos(ang) * len * u;
    const y = y0 + Math.sin(ang) * 16 * u + u * 10;
    ctx.globalAlpha = SKY.night * (1 - u) * 0.22;
    ctx.fillStyle = "#f8e8b0";
    const w = 2 + spread * 16;
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2);
  }
  ctx.restore();
  drawHalo(ctx, HALO_BEAM, x0 + Math.cos(ang) * 26, y0 + Math.sin(ang) * 5, SKY.night * (0.75 + 0.2 * wave(t, 8, 0.2)));
}

function drawSmoke(t) {
  const stacks = [
    { x0: 21, y0: 145 },
    { x0: 68, y0: 133 },
    { x0: 162, y0: 143 },
    { x0: 406, y0: 164 },
  ];
  ctx.fillStyle = "#8a8884";
  for (const s of stacks) {
    for (let i = 0; i < 10; i++) {
      const u = ((t * 8) / LOOP + i * 0.07 + s.x0 * 0.001) % 1;
      const x = s.x0 + Math.round(wave(t, 6, i * 0.1) * 3 * u + gust(t) * 6 * u);
      const y = s.y0 - Math.round(u * 28);
      ctx.globalAlpha = (1 - u) * 0.28;
      ctx.fillRect(x, y, 1 + (u > 0.4 ? 1 : 0), 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawFlag(t) {
  const x = 36;
  const y = 96;
  pline(x, y, x, 204, "#3a3228");
  const g = gust(t);
  const flap = wave(t, 19, 0.3) * (0.4 + g);
  ctx.fillStyle = "#c44030";
  ctx.fillRect(x + 1, y, 5 + Math.round(g * 3), 4);
  ctx.fillRect(x + 6 + Math.round(flap), y + 1, 2, 3);
}

function drawBoats(t) {
  const bob = (k, ph, amp) => Math.round(wave(t, k, ph) * amp);
  const wrapX = (x, span) => ((x % span) + span) % span;

  const ferrySpan = 48;
  let fu = t - 36;
  if (fu < 0) fu += LOOP;
  if (fu < ferrySpan) {
    const p = fu / ferrySpan;
    const fx = Math.round(lerp(W + 20, -40, p));
    const fy = HOR + 8 + bob(3, 0.2, 1);
    ctx.drawImage(FERRY_C, fx, fy);
    ctx.fillStyle = "#f0d080";
    ctx.fillRect(fx + 8, fy + 3, 1, 1);
    ctx.fillRect(fx + 12, fy + 3, 1, 1);
  }

  const paint = (list) => {
    for (const c of list) {
      const y = c.y + bob(c.k, c.ph, c.amp);
      ctx.drawImage(c.img, c.x, y);
      if (c.lamps) {
        ctx.fillStyle = "#f0c878";
        for (const [dx, dy] of c.lamps) ctx.fillRect(c.x + dx, y + dy, 1, 1);
      }
    }
  };

  const span = W + 36;
  paint([
    { img: SAIL_R, x: scroll(t, 1, span) - 16, y: HOR + 6, k: 4, ph: 0.18, amp: 1.1 },
    { img: SAIL_L, x: span - 16 - scroll(t, 2, span), y: HOR + 14, k: 5, ph: 0.44, amp: 1.0 },
    { img: LOBSTER_SL, x: wrapX(scroll(t, 1, span) + 210, span) - 14, y: HOR + 11, k: 3, ph: 0.7, amp: 1.2, lamps: [[4, 3]] },
    { img: CATBOAT_R, x: wrapX(scroll(t, 2, span) + 90, span) - 12, y: HOR + 18, k: 6, ph: 0.22, amp: 0.9 },
  ]);
  paint([
    { img: LOBSTER_C, x: 176, y: HOR + 28, k: 8, ph: 0.4, amp: 1.3, lamps: [[10, 4]] },
    { img: LOBSTER_L, x: 330, y: HOR + 22, k: 5, ph: 0.81, amp: 1.4, lamps: [[5, 4]] },
    { img: LOBSTER_S, x: 208, y: HOR + 18, k: 6, ph: 0.15, amp: 1.2, lamps: [[8, 3]] },
    { img: SAIL_L, x: 286, y: HOR + 20, k: 7, ph: 0.58, amp: 1.1 },
    { img: CATBOAT_L, x: 154, y: HOR + 32, k: 9, ph: 0.08, amp: 1.0 },
    { img: SKIFF_C, x: 318, y: HOR + 32, k: 9, ph: 0.7, amp: 1.2 },
    { img: SKIFF_C, x: 214, y: HOR + 36, k: 6, ph: 0.22, amp: 1.1 },
    { img: SKIFF_C, x: 348, y: HOR + 40, k: 12, ph: 0.33, amp: 1.0 },
    { img: SKIFF_C, x: 148, y: HOR + 34, k: 7, ph: 0.9, amp: 1.0 },
    { img: SKIFF_C, x: 268, y: HOR + 44, k: 11, ph: 0.05, amp: 0.8 },
  ]);
  paint([
    { img: LOBSTER_C, x: 252, y: DECK - 10, k: 7, ph: 0.12, amp: 1.6, lamps: [[10, 4], [16, 3]] },
    { img: LOBSTER_S, x: 168, y: DECK - 9, k: 8, ph: 0.63, amp: 1.3, lamps: [[8, 3]] },
    { img: SAIL_R, x: 226, y: DECK - 18, k: 6, ph: 0.28, amp: 1.2 },
    { img: CATBOAT_R, x: 304, y: DECK - 16, k: 5, ph: 0.51, amp: 1.1 },
    { img: SKIFF_C, x: 292, y: DECK - 4, k: 10, ph: 0.55, amp: 0.9 },
  ]);

  ctx.fillStyle = "#2a241c";
  for (const px of [148, 172, 196, 218, 238, 256, 276, 300, 336, 364, 382]) {
    const ph = px * 0.01;
    const y = HOR + 16 + bob(8, ph, 1.2);
    ctx.fillRect(px, y, 2, QUAY - y);
    ctx.fillStyle = "#4a4034";
    ctx.fillRect(px - 1, y, 4, 2);
    ctx.fillStyle = "#2a241c";
  }

  const by = HOR + 36 + bob(11, 0.5, 1);
  ctx.drawImage(BUOY_C, 356, by);
  drawHalo(ctx, HALO_BUOY, 358, by + 1, 0.45 + 0.4 * (0.5 + 0.5 * wave(t, 2, 0.1)));
  const by2 = HOR + 42 + bob(9, 0.2, 1);
  ctx.drawImage(BUOY_C, 232, by2);
  drawHalo(ctx, HALO_BUOY, 234, by2 + 1, 0.35 + 0.3 * (0.5 + 0.5 * wave(t, 3, 0.4)));
  const by3 = HOR + 30 + bob(7, 0.8, 1);
  ctx.drawImage(BUOY_C, 390, by3);
  drawHalo(ctx, HALO_BUOY, 392, by3 + 1, 0.4 + 0.3 * (0.5 + 0.5 * wave(t, 2, 0.6)));
  const by4 = HOR + 48 + bob(8, 0.35, 1);
  ctx.drawImage(BUOY_C, 188, by4);
  drawHalo(ctx, HALO_BUOY, 190, by4 + 1, 0.32 + 0.28 * (0.5 + 0.5 * wave(t, 4, 0.2)));
  const by5 = HOR + 28 + bob(6, 0.62, 1);
  ctx.drawImage(BUOY_C, 312, by5);
  drawHalo(ctx, HALO_BUOY, 314, by5 + 1, 0.38 + 0.28 * (0.5 + 0.5 * wave(t, 3, 0.75)));
}

function drawGulls(t) {
  const flyers = [
    { k: 3, ph: 0.02, y: 44, amp: 7, dir: 1, rate: 168 },
    { k: 4, ph: 0.41, y: 62, amp: 5, dir: -1, rate: 192 },
    { k: 2, ph: 0.70, y: 38, amp: 8, dir: 1, rate: 156 },
    { k: 5, ph: 0.18, y: 80, amp: 4, dir: 1, rate: 180 },
    { k: 3, ph: 0.55, y: 54, amp: 6, dir: -1, rate: 204 },
  ];
  for (const b of flyers) {
    const span = W + 40;
    const x = b.dir > 0
      ? scroll(t, b.k, span) - 20
      : span - 20 - scroll(t, b.k, span);
    const y = Math.round(b.y + wave(t, b.k * 3, b.ph) * b.amp);
    const fr = flapFrame(t, b.ph, b.rate);
    const sheet = b.dir > 0 ? GULL_R : GULL_L;
    ctx.drawImage(sheet[fr], x, y);
  }

  const perches = [
    { x: 214, y: DECK - 10 },
    { x: 308, y: DECK - 26 },
    { x: LIGHT.cx + 6, y: LIGHT.lantern + 8 },
  ];
  for (const p of perches) ctx.drawImage(GULL_SIT, p.x, p.y);
}

function drawWalker(t) {
  const { cyc, u } = cycle(t, 4, 0.08);
  const idle = cyc === 1 || cyc === 3;
  const left = cyc === 2;
  const x0 = 88;
  const x1 = 286;
  let x;
  let flip = left;
  if (idle) {
    x = cyc === 1 ? x1 : x0;
    ctx.drawImage(cyc === 1 ? WALK_R[0] : WALK_L[0], x, DECK - 8);
    return;
  }
  x = Math.round(lerp(left ? x1 : x0, left ? x0 : x1, smooth(0.04, 0.96, u)));
  flip = left;
  const fr = Math.floor(u * 28) % 4;
  ctx.drawImage(flip ? WALK_L[fr] : WALK_R[fr], x, DECK - 8);
}

function drawStringLights(t) {
  const n = Math.max(SKY.night, SKY.twilight * 0.7);
  if (n < 0.12) return;
  ctx.fillStyle = "#f0c878";
  ctx.globalAlpha = 0.1 * n;
  ctx.fillRect(80, DECK + 1, 230, 6);
  ctx.globalAlpha = 1;
  for (let x = 82; x < 318; x += 10) {
    const glow = n * (0.55 + 0.45 * (0.5 + 0.5 * wave(t, 9, x * 0.03)));
    ctx.fillStyle = glow > 0.5 ? "#ffe08a" : "#b88840";
    ctx.fillRect(x, DECK - 11, 2, 1);
    if (glow > 0.48) drawHalo(ctx, HALO_WIN, x + 0.5, DECK - 10, 0.42 * glow);
  }
  for (let x = 372; x < 456; x += 12) {
    const glow = n * (0.5 + 0.5 * (0.5 + 0.5 * wave(t, 8, x * 0.04)));
    ctx.fillStyle = glow > 0.5 ? "#ffe08a" : "#b88840";
    ctx.fillRect(x, QUAY - 16, 2, 1);
    if (glow > 0.5) drawHalo(ctx, HALO_WIN, x + 0.5, QUAY - 15, 0.36 * glow);
  }
}

function drawWindows(t) {
  const spots = [
    { x: 11, y: 174 },
    { x: 24, y: 174 },
    { x: 11, y: 188 },
    { x: 24, y: 188 },
    { x: 42, y: 128 },
    { x: 42, y: 160 },
    { x: 42, y: 184 },
    { x: 54, y: 156 },
    { x: 64, y: 156 },
    { x: 54, y: 170 },
    { x: 64, y: 170 },
    { x: 54, y: 184 },
    { x: 64, y: 184 },
    { x: 76, y: 170 },
    { x: 76, y: 184 },
    { x: 108, y: 170 },
    { x: 108, y: 184 },
    { x: 120, y: 172 },
    { x: 130, y: 172 },
    { x: 120, y: 186 },
    { x: 141, y: 140 },
    { x: 150, y: 160 },
    { x: 160, y: 160 },
    { x: 150, y: 174 },
    { x: 160, y: 174 },
    { x: 170, y: 172 },
    { x: 178, y: 172 },
    { x: 188, y: 184 },
    { x: 235, y: DECK - 12 },
    { x: 309, y: DECK - 11 },
    { x: 397, y: 187 },
    { x: 394, y: 172 },
    { x: 415, y: 192 },
    { x: LIGHT.cx - 2, y: LIGHT.base - 36 },
    { x: LIGHT.cx - 2, y: LIGHT.base - 18 },
  ];
  const n = Math.max(SKY.night, SKY.twilight * 0.7);
  for (const s of spots) {
    if (n > 0.2) {
      ctx.globalAlpha = n;
      ctx.fillStyle = "#1a1610";
      ctx.fillRect(s.x, s.y, 5, 7);
      ctx.fillStyle = "#ffe8a8";
      ctx.fillRect(s.x + 1, s.y + 1, 1, 2);
      ctx.fillStyle = "#f4d078";
      ctx.fillRect(s.x + 3, s.y + 1, 1, 2);
      ctx.fillStyle = "#e8b050";
      ctx.fillRect(s.x + 1, s.y + 4, 1, 2);
      ctx.fillStyle = "#d49838";
      ctx.fillRect(s.x + 3, s.y + 4, 1, 2);
      ctx.globalAlpha = 1;
      const flicker = n * (0.8 + 0.2 * wave(t, 13 + (s.x & 7), s.x * 0.01));
      drawHalo(ctx, HALO_WIN, s.x + 2, s.y + 3, flicker);
      drawHalo(ctx, HALO_WARM, s.x + 2, s.y + 8, 0.35 * flicker);
    }
  }
  if (n > 0.25) {
    drawHalo(ctx, HALO_LAMP, LIGHT.cx, LIGHT.lantern + 2, n * (0.85 + 0.15 * wave(t, 8, 0.4)));
  } else {
    ctx.fillStyle = "#c8c0b4";
    ctx.fillRect(LIGHT.cx - 4, LIGHT.lantern, 8, 5);
  }
}

function drawQuayLamp(t) {
  const posts = [
    { x: LAMP.x, top: LAMP.top },
    { x: 172, top: 124 },
    { x: 292, top: 128 },
  ];
  for (const post of posts) {
    const x = post.x;
    const top = post.top;
    ctx.fillStyle = "#2a241c";
    ctx.fillRect(x, top, 2, DECK - top);
    ctx.fillStyle = "#3a3228";
    ctx.fillRect(x - 6, top + 1, 8, 1);
    ctx.fillRect(x - 8, top + 2, 5, 4);
    if (SKY.night > 0.12 || SKY.twilight > 0.35) {
      ctx.fillStyle = "#f0d878";
      ctx.fillRect(x - 7, top + 3, 3, 2);
      drawHalo(ctx, HALO_LAMP, x - 5.5, top + 4, SKY.night * (0.55 + 0.2 * wave(t, 7, x * 0.01)));
    } else {
      ctx.fillStyle = "#8a8070";
      ctx.fillRect(x - 7, top + 3, 3, 2);
    }
  }
}

function drawMist(t) {
  const dens = 0.35 + 0.65 * SKY.twilight + 0.4 * SKY.night;
  ctx.fillStyle = SKY.day > 0.5 ? "#d8dce0" : "#c8c4bc";
  const g = gust(t);
  for (let i = 0; i < 140; i++) {
    const y = HOR - 10 + (i % 22) * 3;
    const x = (scroll(t, 2, W) + i * 17 + Math.round(g * 10)) % W;
    ctx.globalAlpha = dens * (0.05 + 0.04 * ((i * 3) % 5 === 0 ? 1 : 0));
    ctx.fillRect(x, y, 4 + (i % 4), 1);
  }
  ctx.globalAlpha = 1;
}

function drawRain(t) {
  const g = gust(t);
  ctx.fillStyle = "#b8c0c8";
  for (let i = 0; i < 70; i++) {
    const u = frac(t * 0.45 + hash(i, 2) * 8);
    const x = Math.round((hash(i) * W + g * 18 * u) % W);
    const y = Math.round(u * H);
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x, y, 1, 2);
  }
  ctx.globalAlpha = 1;
}

function drawForeground(t) {
  ctx.drawImage(TRAPS_C, 188, QUAY - 8);
  ctx.drawImage(TRAPS_C, 168, DECK - 8);
  ctx.drawImage(TRAPS_C, 270, DECK - 8);
  ctx.drawImage(TRAPS_C, 292, DECK - 6);
  ctx.drawImage(TRAPS_C, 204, DECK - 8);
  ctx.drawImage(CRATE_C, 248, DECK - 6);
  ctx.drawImage(CRATE_C, 258, DECK - 6);
  ctx.drawImage(CRATE_C, 188, DECK - 6);
  ctx.drawImage(CRATE_C, 176, DECK - 6);
  ctx.drawImage(COIL_C, 228, DECK - 6);
  ctx.drawImage(COIL_C, 280, DECK - 6);
  ctx.drawImage(COIL_C, 198, DECK - 6);
  ctx.drawImage(COIL_C, 312, DECK - 6);
  ctx.drawImage(BARREL_C, 200, DECK - 7);
  ctx.drawImage(BARREL_C, 160, DECK - 7);
  ctx.drawImage(BARREL_C, 266, DECK - 7);
  ctx.drawImage(NET_C, 198, QUAY - 18);
  ctx.drawImage(NET_C, 128, DECK - 14);
  ctx.drawImage(NET_C, 302, DECK - 14);
  ctx.drawImage(CAT_C, 236, DECK - 10 + Math.round(0.4 * (wave(t, 2, 0.9) > 0.7)));
  ctx.fillStyle = "#1c1814";
  ctx.fillRect(0, H - 8, W, 8);
  for (let i = 0; i < W; i += 5) {
    ctx.fillStyle = i % 10 ? "#241c16" : "#1a1410";
    ctx.fillRect(i, H - 10, 4, 2);
  }
}

function renderFrame(t, sky) {
  if (sky) SKY = sky;
  const sunP = bodyProject(SKY.sun);
  const moonP = bodyProject(SKY.moon);
  ctx.drawImage(skySheet(SKY), 0, 0);
  drawStars(t);
  if (SKY.sun.alt > -3) {
    const a = clamp((SKY.sun.alt + 3) / 8, 0, 1);
    drawHalo(ctx, HALO_SUN, sunP.x, sunP.y, a);
    ctx.globalAlpha = a;
    ctx.drawImage(SUN_C, Math.round(sunP.x) - 8, Math.round(sunP.y) - 8);
    ctx.globalAlpha = 1;
  }
  if (SKY.moon.alt > -2 && SKY.night > 0.12) {
    ctx.globalAlpha = clamp(SKY.night + 0.2, 0, 1);
    ctx.drawImage(MOON_C, Math.round(moonP.x) - 7, Math.round(moonP.y) - 7);
    drawHalo(ctx, HALO_MOON, moonP.x, moonP.y, SKY.night);
    ctx.globalAlpha = 1;
  }
  drawClouds(t);
  drawHills(t);
  drawWater(t);
  ctx.fillStyle = "#1a1612";
  for (const px of [108, 128, 158, 182, 222, 258, 304]) {
    ctx.fillRect(px, HOR - 5, 28, 2);
    for (let k = 0; k < 5; k++) ctx.fillRect(px + 3 + k * 5, HOR - 5, 2, 7);
  }
  drawBeam(t);
  ctx.drawImage(SPIT_C, 0, 0);
  ctx.drawImage(LIGHT_C, 0, 0);
  ctx.drawImage(VILLAGE_C, 0, 0);
  if (SKY.day > 0.04) {
    ctx.globalAlpha = SKY.day;
    ctx.drawImage(SPIT_DAY, 0, 0);
    ctx.drawImage(LIGHT_DAY, 0, 0);
    ctx.drawImage(VILLAGE_DAY, 0, 0);
    ctx.globalAlpha = 1;
  }
  drawQuayLamp(t);
  drawSmoke(t);
  drawFlag(t);
  ctx.drawImage(DOCK_C, 0, 0);
  if (SKY.day > 0.04) {
    ctx.globalAlpha = SKY.day;
    ctx.drawImage(DOCK_DAY, 0, 0);
    ctx.globalAlpha = 1;
  }
  drawStringLights(t);
  drawBoats(t);
  reflect(ctx, t, { top: HOR, rows: 54, squash: 1.6, alpha: 0.42 + 0.14 * SKY.night, k1: 41, k2: 97, amp: 0.66, grow: 0.045 });
  const glow = 0.2 + 0.8 * SKY.night;
  if (glow > 0.25) {
    streak(ctx, t, LIGHT.cx, 3.6, "#f0d878", 0.52 * glow, 1.1, HOR, HOR + 52);
    streak(ctx, t, 20, 1.8, "#f0c060", 0.36 * glow, 2.2, HOR, HOR + 34);
    streak(ctx, t, 44, 2.2, "#e8b868", 0.34 * glow, 2.4, HOR, HOR + 36);
    streak(ctx, t, 94, 1.8, "#e8e0d4", 0.22 * glow, 2.8, HOR, HOR + 32);
    streak(ctx, t, 142, 1.6, "#e0b060", 0.28 * glow, 3.2, HOR, HOR + 30);
    streak(ctx, t, 158, 1.4, "#e0b060", 0.26 * glow, 4.2, HOR, HOR + 28);
    streak(ctx, t, LAMP.x - 5, 2.2, "#f4d078", 0.38 * glow, 2.0, HOR, HOR + 38);
    streak(ctx, t, 286, 2.0, "#f4d078", 0.32 * glow, 2.4, HOR, HOR + 34);
    streak(ctx, t, 310, 1.6, "#e8b868", 0.28 * glow, 3.4, HOR, HOR + 30);
    streak(ctx, t, 400, 1.5, "#e8b868", 0.28 * glow, 3.2, HOR, HOR + 32);
    streak(ctx, t, 358, 1.2, "#e05040", 0.18 * glow, 4.0, HOR, HOR + 24);
    streak(ctx, t, 190, 1.1, "#e05040", 0.14 * glow, 4.2, HOR, HOR + 22);
    streak(ctx, t, 314, 1.1, "#e05040", 0.14 * glow, 4.4, HOR, HOR + 22);
    for (let x = 82; x < 318; x += 18) {
      streak(ctx, t, x, 0.9, "#f2d078", 0.18 * glow, 5.0 + (x % 7), HOR, HOR + 22);
    }
    for (let x = 372; x < 456; x += 18) {
      streak(ctx, t, x, 0.8, "#f2d078", 0.14 * glow, 5.4 + (x % 5), HOR, HOR + 20);
    }
  } else if (SKY.sun.alt > 0) {
    streak(ctx, t, sunP.x, 4.2, "#f0e0a0", 0.28, 1.4, HOR, HOR + 48);
  }
  drawWindows(t);
  drawGulls(t);
  drawWalker(t);
  drawMist(t);
  if (SKY.night > 0.15 || SKY.twilight > 0.4) drawRain(t);
  drawForeground(t);
  ctx.globalAlpha = 0.3 + 0.7 * SKY.night;
  ctx.drawImage(VIG_C, 0, 0);
  ctx.globalAlpha = 1;
}

const GULLS = [
  { t: 42, pan: -0.55, gain: 0.68 },
  { t: 126, pan: 0.46, gain: 0.52 },
  { t: 204, pan: -0.18, gain: 0.6 },
];
const BELL_T = [28, 88, 148, 208];
const FERRY_T0 = 36;
const FERRY_DUR = 48;

export default {
  id: "east-passage",
  name: "East Passage",
  tagline: "Fog on the harbor",
  timeZone: "America/New_York",
  accent: "#e0a050",
  focusX: FOCUS,
  ambience: { water: 0.7, waves: 0.45, wind: 0.35, rain: 0.18 },
  events: [
    { t: FERRY_T0, type: "boat", dur: FERRY_DUR, pan: [1, -1], gain: 0.65 },
    { t: 102, type: "boat", dur: 22, pan: [-0.4, 0.5], gain: 0.4 },
    ...GULLS.map((g) => ({ t: g.t, type: "gull", pan: g.pan, gain: g.gain })),
    ...BELL_T.map((t) => ({ t, type: "bell", x: 356, gain: 0.7 })),
    { t: 74, type: "splash", x: 330, gain: 0.35 },
    { t: 190, type: "horn", gain: 0.45 },
  ],
  create(c) {
    ctx = c;
    ctx.imageSmoothingEnabled = false;
    prerender();
    return { render: renderFrame };
  },
};
