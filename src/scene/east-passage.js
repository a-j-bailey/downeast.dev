/**
 * East Passage — a quiet New England fishing village after dark.
 * Fog over the harbor, a working wharf, lobster traps, a granite light on the spit.
 *
 * Original Canvas2D painter for downeast.dev. Deterministic 240 s loop.
 */
import {
  W, H, LOOP, TAU, frac, clamp, lerp, smooth, wave, step, cycle, scroll,
  hash, rng, bayer, hex, makeCanvas, makeHalo, drawHalo, reflect, streak, text,
} from "../engine/core.js";

let ctx;

const HOR = 148;
const QUAY = 206;
const DECK = 198;
const MOON = { x: 86, y: 26 };
const LIGHT = { cx: 428, base: 196, lantern: 62, w: 16 };
const FOCUS = 268;

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

const gust = (t) => clamp(0.38 + 0.28 * wave(t, 4, 0.18) + 0.16 * wave(t, 11, 0.61) + 0.1 * wave(t, 23, 0.07), 0, 1);

/* ================= Sky ================= */
const SKY = [
  "#07080e", "#0a0d14", "#0e121c", "#121824", "#171e2c", "#1c2534",
  "#232c3c", "#2a3442", "#323a44", "#3c403c", "#4a4438", "#5a4c38",
].map(hex);

function renderSky() {
  const [c, x] = makeCanvas(W, H);
  const img = x.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let i = 0; i < W; i++) {
      let v = Math.pow(Math.min(1, y / 160), 1.25) * 0.78;
      v += Math.max(0, 1 - Math.hypot((i - 90) / 220, (y - 28) / 70)) * 0.18;
      v += Math.max(0, 1 - Math.hypot((i - 70) / 160, (y - 190) / 90)) * 0.22;
      v += Math.max(0, 1 - Math.hypot((i - 428) / 90, (y - 80) / 80)) * 0.14;
      const f = clamp(v, 0, 1) * (SKY.length - 1);
      let k = Math.floor(f);
      if (f - k > bayer(i, y)) k++;
      const col = SKY[Math.min(k, SKY.length - 1)];
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

const STARS = [];
{
  const r = rng(41);
  while (STARS.length < 34) {
    const x = Math.floor(r() * W);
    const y = 3 + Math.floor(r() * 78);
    if (Math.hypot(x - MOON.x, y - MOON.y) < 18) continue;
    STARS.push({ x, y, k: 11 + Math.floor(r() * 70), ph: r(), b: 0.22 + r() * 0.55 });
  }
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
function renderHills() {
  const p = painter(W, H);
  const r = rng(77);
  const ridge = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    ridge[i] =
      HOR -
      10 -
      8 * Math.sin(i * 0.018) -
      5 * Math.sin(i * 0.041 + 1.2) -
      3 * Math.sin(i * 0.09) -
      (i > 360 ? (i - 360) * 0.08 : 0);
  }
  for (let i = 0; i < W; i++) {
    const top = Math.round(ridge[i]);
    for (let y = top; y < HOR + 8; y++) {
      const t = (y - top) / 22;
      let col = t < 0.3 ? "#14181c" : t < 0.7 ? "#12161a" : "#101418";
      if (((i * 13 + y * 7) & 7) === 0) col = "#181c20";
      p.set(i, y, col);
    }
  }
  for (let n = 0; n < 28; n++) {
    const x = 12 + Math.floor(r() * 340);
    const y = Math.round(ridge[x]) - 6 - Math.floor(r() * 4);
    const h = 7 + Math.floor(r() * 5);
    for (let k = 0; k < h; k++) {
      const w = Math.max(1, Math.round((1 - k / h) * 3));
      p.rect(x - w, y + k, w * 2 + 1, 1, k < 2 ? "#1a2018" : "#141810");
    }
  }
  const lights = [];
  for (let n = 0; n < 18; n++) {
    const x = 20 + Math.floor(r() * 300);
    const y = Math.round(ridge[x]) + 2 + Math.floor(r() * 6);
    lights.push({ x, y, ph: r(), k: 3 + Math.floor(r() * 9) });
    p.set(x, y, "#c8a060");
  }
  const sheet = p.done();
  return { sheet, lights };
}

/* ================= Lighthouse + spit ================= */
function renderSpit() {
  const p = painter(W, H);
  for (let i = 372; i < W; i++) {
    const rise = Math.max(0, (i - 390) * 0.18);
    const top = QUAY - 8 - rise;
    for (let y = Math.round(top); y < QUAY + 12; y++) {
      const wet = y > QUAY - 2;
      let col = wet ? "#2a2824" : ((i + y) & 3) === 0 ? "#4a463c" : "#3a3830";
      if (hash(i, y, 3) > 0.82) col = "#524e44";
      if (hash(i, y, 9) > 0.93) col = "#2c2a24";
      p.set(i, y, col);
    }
  }
  for (let k = 0; k < 14; k++) {
    const x = 378 + k * 7;
    const y = QUAY - 4 + (k & 1);
    p.rect(x, y, 3, 2, "#2e2c28");
    p.set(x + 1, y - 1, "#3a3832");
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
  p.rect(cx - 4, lantern, 8, 5, "#f0d878");
  p.set(cx - 1, lantern + 1, "#fff6c8");
  p.set(cx + 1, lantern + 2, "#fff6c8");
  p.rect(cx - 7, lantern - 6, 14, 4, "#8a2018");
  p.set(cx, lantern - 7, "#6a1814");
  p.rect(cx - 1, lantern - 10, 2, 4, "#2a2824");
  p.rect(cx - 11, lantern + 10, 4, 2, "#d0c8bc");
  p.rect(cx + 7, lantern + 10, 4, 2, "#d0c8bc");
  p.rect(cx - 3, base - 18, 3, 5, "#1c1a16");
  p.set(cx - 2, base - 16, "#c89040");
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
    p.rect(x + 1, y + 1, 2, 2, "#f0c878");
    p.rect(x + 4, y + 1, 2, 2, "#e8b868");
    p.rect(x + 1, y + 4, 2, 3, "#d4a050");
    p.rect(x + 4, y + 4, 2, 3, "#c89040");
  } else {
    p.rect(x + 1, y + 1, 5, 6, "#141820");
  }
  p.rect(x + 3, y, 1, 8, "#2a2418");
  p.rect(x, y + 3, 7, 1, "#2a2418");
}

function renderVillage() {
  const p = painter(W, H);
  for (let i = 0; i < 176; i++) {
    const top = QUAY - 4 - Math.round(2 * Math.sin(i * 0.2));
    for (let y = top; y < H; y++) {
      const col = y > QUAY + 8 ? "#1a1612" : ((i + y) & 2 ? "#2c241c" : "#32281e");
      p.set(i, y, col);
    }
  }

  p.rect(8, 168, 52, 40, "#2a2218");
  shakeWall(p, 8, 176, 52, 32, "#241c14", "#2e241a", "#3a2c20");
  for (let i = 6; i < 62; i++) {
    const y = 168 - Math.round((1 - Math.abs((i - 34) / 28)) * 10);
    p.line(i, y, i, 176, i < 34 ? "#4a3828" : "#3a2c20");
    p.set(i, y, "#5a4834");
  }
  p.rect(6, 175, 56, 2, "#2a2018");
  windowPane(p, 16, 184, true);
  windowPane(p, 38, 184, true);
  p.rect(28, 196, 8, 12, "#1c1610");
  p.set(34, 202, "#c89040");

  p.rect(58, 154, 64, 54, "#262018");
  shakeWall(p, 58, 164, 64, 44, "#201a14", "#2a2218", "#382c20");
  for (let i = 54; i < 126; i++) {
    const y = 152 - Math.round((1 - Math.abs((i - 90) / 36)) * 14);
    p.line(i, y, i, 164, i < 90 ? "#4e3c28" : "#3e3022");
    p.set(i, y, "#5c4a32");
  }
  p.rect(54, 163, 72, 2, "#2a2018");
  p.rect(108, 140, 6, 16, "#3a3024");
  p.rect(107, 138, 8, 3, "#2a2418");
  windowPane(p, 68, 176, true);
  windowPane(p, 88, 176, true);
  windowPane(p, 68, 192, false);
  windowPane(p, 88, 192, true);
  p.rect(100, 196, 10, 12, "#1a1410");
  p.set(108, 202, "#a07038");

  p.rect(122, 178, 28, 28, "#2c241c");
  shakeWall(p, 122, 184, 28, 22, "#241c16", "#32281e", "#3c3024");
  for (let i = 120; i < 152; i++) {
    const y = 176 - Math.round((1 - Math.abs((i - 136) / 16)) * 7);
    p.line(i, y, i, 184, "#3a2e22");
    p.set(i, y, "#4a3c2c");
  }
  windowPane(p, 130, 190, true);

  p.rect(4, 204, 10, 3, "#8a2820");
  p.rect(5, 201, 8, 3, "#c44030");
  p.set(8, 200, "#e8e0d0");
  p.rect(44, 206, 8, 3, "#a07820");
  p.rect(45, 203, 6, 3, "#d4a020");
  p.set(48, 202, "#e8e0d0");
  p.rect(112, 208, 8, 3, "#7a2018");
  p.rect(113, 205, 6, 3, "#c44030");

  const sheet = p.done();
  const sx = sheet.getContext("2d");
  sx.imageSmoothingEnabled = false;
  text(sx, "BAIT", 64, 158, "#c8b090");
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
  const [c, x] = makeCanvas(48, 28);
  x.drawImage(trap, 2, 10);
  x.drawImage(trap, 10, 8);
  x.drawImage(trap, 18, 12);
  x.drawImage(trap, 8, 16);
  x.drawImage(trap, 16, 18);
  x.drawImage(trap, 24, 14);
  return c;
}

function renderDock() {
  const p = painter(W, H);
  for (let i = 70; i < 292; i++) {
    const y0 = DECK;
    for (let y = y0; y < y0 + 16; y++) {
      const plank = Math.floor((i - 70) / 7);
      const gap = (i - 70) % 7 === 6;
      let col = gap ? "#1a1410" : plank & 1 ? "#4a3a28" : "#3e3222";
      if (!gap && hash(i, y, 5) > 0.88) col = "#524030";
      if (y > y0 + 12) col = "#2a2018";
      p.set(i, y, col);
    }
  }
  for (let x = 86; x < 280; x += 22) {
    p.rect(x, DECK + 14, 4, 28, "#2a2218");
    p.rect(x + 1, DECK + 14, 2, 28, "#3a2e20");
    p.rect(x - 1, QUAY + 18, 6, 3, "#1c1814");
  }
  p.rect(78, DECK - 1, 210, 1, "#5a4a34");
  for (let x = 92; x < 270; x += 18) {
    p.rect(x, DECK - 8, 1, 8, "#3a3228");
    p.rect(x - 4, DECK - 9, 9, 1, "#4a4034");
  }
  return p.done();
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
function renderLobsterBoat() {
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

function renderGull(frame) {
  const rows = [
    ["..w..", ".w.w.", "w...w"],
    [".w.w.", "..w..", "w...w"],
    ["w...w", ".w.w.", "..w.."],
  ][frame];
  return sprite(rows, { w: "#e8e4dc" });
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
let SKY_C, MOON_C, HILLS, SPIT_C, LIGHT_C, VILLAGE_C, DOCK_C, TRAPS_C, CRATE_C;
let LOBSTER_C, SKIFF_C, FERRY_C, BUOY_C, CAT_C, VIG_C;
let GULLS, WALK_R, WALK_L;
let HALO_MOON, HALO_WIN, HALO_LAMP, HALO_BEAM, HALO_BUOY;

function prerender() {
  SKY_C = renderSky();
  MOON_C = renderMoon();
  HILLS = renderHills();
  SPIT_C = renderSpit();
  LIGHT_C = renderLighthouse();
  VILLAGE_C = renderVillage();
  DOCK_C = renderDock();
  TRAPS_C = renderTraps();
  CRATE_C = renderCrate();
  LOBSTER_C = renderLobsterBoat();
  SKIFF_C = renderSkiff();
  FERRY_C = renderFerry();
  BUOY_C = renderBuoy();
  CAT_C = renderCat();
  VIG_C = renderVignette();
  GULLS = [renderGull(0), renderGull(1), renderGull(2)];
  WALK_R = [0, 1, 2, 3].map((f) => renderWalker(f, false));
  WALK_L = [0, 1, 2, 3].map((f) => renderWalker(f, true));
  HALO_MOON = makeHalo(18, "#f0ece0", 0.22, 1.6, 5);
  HALO_WIN = makeHalo(10, "#f0c060", 0.45, 1.8, 5);
  HALO_LAMP = makeHalo(14, "#f4d078", 0.55, 1.7, 6);
  HALO_BEAM = makeHalo(28, "#f8e8b0", 0.28, 2.2, 5);
  HALO_BUOY = makeHalo(6, "#e05040", 0.5, 1.6, 4);
}

/* ================= Frame ================= */
function drawStars(t) {
  ctx.fillStyle = "#e8e4d8";
  for (const s of STARS) {
    const a = s.b * (0.45 + 0.55 * (0.5 + 0.5 * wave(t, s.k, s.ph)));
    if (a < 0.18) continue;
    ctx.globalAlpha = a;
    ctx.fillRect(s.x, s.y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawClouds(t) {
  for (const layer of CLOUDS) {
    const ox = scroll(t, layer.k, W);
    ctx.drawImage(layer.c, ox - W, layer.y);
    ctx.drawImage(layer.c, ox, layer.y);
  }
}

function drawHills(t) {
  ctx.drawImage(HILLS.sheet, 0, 0);
  for (const L of HILLS.lights) {
    const on = 0.55 + 0.45 * (0.5 + 0.5 * wave(t, L.k, L.ph));
    if (on < 0.4) continue;
    ctx.globalAlpha = on;
    ctx.fillStyle = "#e8c878";
    ctx.fillRect(L.x, L.y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawWater(t) {
  const pal = ["#0c141c", "#101820", "#141e28", "#1a2834", "#223040"];
  for (let y = HOR; y < QUAY + 22; y++) {
    const depth = (y - HOR) / (QUAY + 22 - HOR);
    const k = Math.min(pal.length - 1, Math.floor(depth * pal.length));
    ctx.fillStyle = pal[k];
    ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = "#1c3038";
    ctx.globalAlpha = 0.12 + 0.1 * wave(t, 17, y * 0.02);
    const ox = Math.round(wave(t, 9, y * 0.03) * (1 + depth * 2));
    for (let i = (y * 3) % 11; i < W; i += 11) ctx.fillRect(i + ox, y, 2, 1);
  }
  ctx.globalAlpha = 1;
}

function drawBeam(t) {
  const ang = TAU * (t / LOOP) * 8;
  const len = 90;
  const x0 = LIGHT.cx;
  const y0 = LIGHT.lantern + 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < 18; k++) {
    const u = k / 18;
    const spread = 0.18 + u * 0.35;
    const x = x0 + Math.cos(ang) * len * u;
    const y = y0 + Math.sin(ang) * 12 * u + u * 6;
    ctx.globalAlpha = (1 - u) * 0.12;
    ctx.fillStyle = "#f4e0a0";
    const w = 1 + spread * 10;
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 1);
  }
  ctx.restore();
  drawHalo(ctx, HALO_BEAM, x0 + Math.cos(ang) * 22, y0 + Math.sin(ang) * 4, 0.55 + 0.2 * wave(t, 8, 0.2));
}

function drawSmoke(t) {
  const x0 = 111;
  const y0 = 136;
  ctx.fillStyle = "#8a8884";
  for (let i = 0; i < 10; i++) {
    const u = ((t * 8) / LOOP + i * 0.07) % 1;
    const x = x0 + Math.round(wave(t, 6, i * 0.1) * 3 * u + gust(t) * 6 * u);
    const y = y0 - Math.round(u * 28);
    ctx.globalAlpha = (1 - u) * 0.28;
    ctx.fillRect(x, y, 1 + (u > 0.4 ? 1 : 0), 1);
  }
  ctx.globalAlpha = 1;
}

function drawFlag(t) {
  const x = 150;
  const y = 168;
  pline(x, y, x, DECK, "#3a3228");
  const g = gust(t);
  const flap = wave(t, 19, 0.3) * (0.4 + g);
  ctx.fillStyle = "#c44030";
  ctx.fillRect(x + 1, y, 5 + Math.round(g * 3), 4);
  ctx.fillRect(x + 6 + Math.round(flap), y + 1, 2, 3);
}

function drawBoats(t) {
  const bob = Math.round(wave(t, 7, 0.12) * 1.6);
  ctx.drawImage(LOBSTER_C, 252, DECK - 10 + bob);
  ctx.fillStyle = "#f0c878";
  ctx.fillRect(262, DECK - 6 + bob, 1, 1);
  ctx.fillRect(268, DECK - 7 + bob, 1, 1);

  const bob2 = Math.round(wave(t, 9, 0.7) * 1.2);
  ctx.drawImage(SKIFF_C, 318, HOR + 26 + bob2);


  const ferrySpan = 48;
  let fu = t - 36;
  if (fu < 0) fu += LOOP;
  if (fu < ferrySpan) {
    const p = fu / ferrySpan;
    const fx = Math.round(lerp(W + 20, -40, p));
    const fy = HOR - 4 + Math.round(wave(t, 3, 0.2));
    ctx.drawImage(FERRY_C, fx, fy);
    ctx.fillStyle = "#f0d080";
    ctx.fillRect(fx + 8, fy + 3, 1, 1);
    ctx.fillRect(fx + 12, fy + 3, 1, 1);
  }

  const by = HOR + 36 + Math.round(wave(t, 11, 0.5));
  ctx.drawImage(BUOY_C, 356, by);
  drawHalo(ctx, HALO_BUOY, 358, by + 1, 0.45 + 0.4 * (0.5 + 0.5 * wave(t, 2, 0.1)));
}

function drawGulls(t) {
  const birds = [
    { k: 3, ph: 0.02, y: 48, amp: 10 },
    { k: 4, ph: 0.41, y: 62, amp: 8 },
    { k: 2, ph: 0.7, y: 40, amp: 14 },
    { k: 5, ph: 0.18, y: 88, amp: 6 },
  ];
  for (const b of birds) {
    const x = scroll(t, b.k, W + 30) - 15;
    const y = Math.round(b.y + wave(t, b.k * 3, b.ph) * b.amp);
    const fr = step(t, 24) % 3;
    ctx.drawImage(GULLS[fr], x, y);
  }
}

function drawWalker(t) {
  const { cyc, u } = cycle(t, 4, 0.08);
  const idle = cyc === 1 || cyc === 3;
  const left = cyc === 2;
  const x0 = 96;
  const x1 = 248;
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
  for (let x = 88; x < 272; x += 13) {
    const glow = 0.55 + 0.45 * (0.5 + 0.5 * wave(t, 9, x * 0.03));
    ctx.fillStyle = glow > 0.5 ? "#f2d078" : "#a07838";
    ctx.fillRect(x, DECK - 11, 2, 1);
    if (glow > 0.6) drawHalo(ctx, HALO_WIN, x + 0.5, DECK - 10, 0.28 * glow);
  }
}

function drawWindows(t) {
  const spots = [
    { x: 19, y: 187 },
    { x: 41, y: 187 },
    { x: 71, y: 179 },
    { x: 91, y: 179 },
    { x: 91, y: 195 },
    { x: 133, y: 193 },
  ];
  for (const s of spots) {
    const flicker = 0.75 + 0.25 * wave(t, 13 + (s.x & 7), s.x * 0.01);
    drawHalo(ctx, HALO_WIN, s.x + 3, s.y + 3, flicker);
  }
  drawHalo(ctx, HALO_LAMP, LIGHT.cx, LIGHT.lantern + 2, 0.7 + 0.15 * wave(t, 8, 0.4));
  drawHalo(ctx, HALO_MOON, MOON.x, MOON.y, 0.85);
}

function drawMist(t) {
  ctx.fillStyle = "#c8c4bc";
  const g = gust(t);
  for (let i = 0; i < 90; i++) {
    const y = HOR - 6 + (i % 18) * 3;
    const x = (scroll(t, 2, W) + i * 17 + Math.round(g * 8)) % W;
    ctx.globalAlpha = 0.04 + 0.03 * ((i * 3) % 5 === 0 ? 1 : 0);
    ctx.fillRect(x, y, 3 + (i % 3), 1);
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
  ctx.drawImage(TRAPS_C, 14, QUAY - 6);
  ctx.drawImage(CRATE_C, 248, DECK - 6);
  ctx.drawImage(CRATE_C, 258, DECK - 6);
  ctx.drawImage(CAT_C, 252, DECK - 10 + Math.round(0.4 * (wave(t, 2, 0.9) > 0.7)));
  ctx.fillStyle = "#1c1814";
  ctx.fillRect(0, H - 8, W, 8);
  for (let i = 0; i < W; i += 5) {
    ctx.fillStyle = i % 10 ? "#241c16" : "#1a1410";
    ctx.fillRect(i, H - 10, 4, 2);
  }
}

function renderFrame(t) {
  ctx.drawImage(SKY_C, 0, 0);
  drawStars(t);
  ctx.drawImage(MOON_C, MOON.x - 7, MOON.y - 7);
  drawClouds(t);
  drawHills(t);
  drawWater(t);
  drawBeam(t);
  ctx.drawImage(SPIT_C, 0, 0);
  ctx.drawImage(LIGHT_C, 0, 0);
  ctx.drawImage(VILLAGE_C, 0, 0);
  drawSmoke(t);
  drawFlag(t);
  ctx.drawImage(DOCK_C, 0, 0);
  drawStringLights(t);
  drawBoats(t);
  reflect(ctx, t, { top: HOR, rows: 42, squash: 1.7, alpha: 0.42, k1: 41, k2: 97, amp: 0.55, grow: 0.04 });
  streak(ctx, t, LIGHT.cx, 3.2, "#f0d878", 0.35, 1.2, HOR, HOR + 40);
  streak(ctx, t, 20, 1.6, "#e8b868", 0.22, 2.4, HOR, HOR + 28);
  streak(ctx, t, 72, 1.8, "#e8b868", 0.2, 3.1, HOR, HOR + 30);
  streak(ctx, t, 134, 1.4, "#e0b060", 0.18, 4.0, HOR, HOR + 24);
  drawWindows(t);
  drawGulls(t);
  drawWalker(t);
  drawMist(t);
  drawRain(t);
  drawForeground(t);
  ctx.drawImage(VIG_C, 0, 0);
}

const GULL_T = [18, 64, 112, 168, 214];
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
    ...GULL_T.map((t) => ({ t, type: "gull", pan: 0 })),
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
