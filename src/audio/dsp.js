import { rng, clamp } from "../engine/core.js";

const TWO_PI = Math.PI * 2;
const caches = new WeakMap();

function cached(ac, key, make) {
  let m = caches.get(ac);
  if (!m) caches.set(ac, (m = new Map()));
  if (!m.has(key)) m.set(key, make());
  return m.get(key);
}

const strSeed = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const ftom = (f) => 69 + 12 * Math.log2(f / 440);

export function hold(param, t) {
  if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(t);
  else param.cancelScheduledValues(t);
}

export function ramp(param, v, t, dur) {
  hold(param, t);
  param.setTargetAtTime(v, t, Math.max(dur, 0.003) / 3);
}

export function powerCurve(up, n = 16) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI / 2;
    c[i] = up ? Math.sin(a) : Math.cos(a);
  }
  return c;
}

const NOISE_SEC = { white: 2.9, pink: 4.1, brown: 5.6 };

export function noise(ac, type = "white", sec = NOISE_SEC[type] || 3) {
  return cached(ac, `n:${type}:${sec}`, () => {
    const sr = ac.sampleRate;
    const N = Math.round(sec * sr);
    const F = Math.round(0.05 * sr);
    const r = rng(strSeed("ns-" + type));
    const x = new Float32Array(N + F);
    if (type === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < x.length; i++) {
        const w = r() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
      }
    } else if (type === "brown") {
      const a = 1 / (1 + TWO_PI * 25 / sr);
      let last = 0, prev = 0, y = 0;
      for (let i = 0; i < x.length; i++) {
        last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
        y = a * (y + last - prev);
        prev = last;
        x[i] = y;
      }
    } else {
      for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1;
    }
    let ss = 0;
    for (let i = F; i < x.length; i++) ss += x[i] * x[i];
    const g = 0.2 / Math.sqrt(ss / (x.length - F) || 1);
    const buf = ac.createBuffer(1, N, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < N; i++) d[i] = x[i] * g;
    for (let i = 0; i < F; i++) {
      const th = (i / F) * Math.PI / 2;
      d[i] = (x[N + i] * Math.cos(th) + x[i] * Math.sin(th)) * g;
    }
    return buf;
  });
}

export function crackle(ac) {
  return cached(ac, "crackle", () => {
    const sr = ac.sampleRate;
    const sec = 7.2;
    const N = Math.round(sec * sr);
    const r = rng(strSeed("crackle-de"));
    const x = new Float32Array(N);
    const add = (i, v) => {
      x[((i % N) + N) % N] += v;
    };
    const clicks = Math.round(9 * sec);
    for (let n = 0; n < clicks; n++) {
      let i = Math.floor(r() * N);
      const amp = 0.08 + 0.6 * r() * r() * r();
      const sign = r() < 0.5 ? -1 : 1;
      const burst = 1 + Math.floor(r() * 6);
      for (let k = 0; k < burst; k++) add(i + k, sign * amp * Math.exp(-k / 2));
    }
    const pops = Math.round(0.25 * sec);
    for (let n = 0; n < pops; n++) {
      let i = Math.floor(r() * N);
      const amp = 0.5 + r() * 0.4;
      const len = 20 + Math.floor(r() * 40);
      for (let k = 0; k < len; k++) add(i + k, amp * Math.sin((k / len) * Math.PI));
    }
    const ticks = Math.round(sec / 1.8);
    for (let n = 0; n < ticks; n++) add(Math.floor((n + 0.15) * 1.8 * sr), 0.35);
    let prev = 0, peak = 0;
    for (let i = 0; i < N; i++) {
      const y = x[i] - 0.97 * prev;
      prev = x[i];
      x[i] = y;
      peak = Math.max(peak, Math.abs(y));
    }
    const g = 0.9 / (peak || 1);
    const buf = ac.createBuffer(1, N, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < N; i++) d[i] = x[i] * g;
    return buf;
  });
}

export function drops(ac, level = 0.5) {
  return cached(ac, `drops:${level.toFixed(2)}`, () => {
    const sr = ac.sampleRate;
    const sec = 2.4;
    const N = Math.round(sec * sr);
    const r = rng(strSeed("drops-" + level));
    const x = new Float32Array(N);
    const n = Math.round(60 + 80 * level);
    for (let k = 0; k < n; k++) {
      const i0 = Math.floor(r() * N);
      const f = 2000 + r() * 5000;
      const len = Math.round((0.008 + r() * 0.02) * sr);
      for (let j = 0; j < len; j++) {
        const i = (i0 + j) % N;
        x[i] += Math.sin(TWO_PI * f * j / sr) * Math.exp(-j / (0.006 * sr));
      }
    }
    let peak = 0;
    for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(x[i]));
    const g = 0.6 / (peak || 1);
    const buf = ac.createBuffer(1, N, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < N; i++) d[i] = x[i] * g;
    return buf;
  });
}

export function impulse(ac, { sec = 2.4, rt60 = 2 } = {}) {
  return cached(ac, `ir:${sec}:${rt60}`, () => {
    const sr = ac.sampleRate;
    const N = Math.round(sec * sr);
    const pre = Math.round(0.015 * sr);
    const fade = Math.round(0.06 * sr);
    const rL = rng(strSeed("irL"));
    const rR = rng(strSeed("irR"));
    const buf = ac.createBuffer(2, N, sr);
    for (let ch = 0; ch < 2; ch++) {
      const r = ch ? rR : rL;
      const d = buf.getChannelData(ch);
      for (let i = 0; i < N; i++) {
        if (i < pre) continue;
        const t = (i - pre) / sr;
        const env = Math.exp((-6.91 * t) / rt60);
        const damp = 8000 * Math.exp(-t * 1.4) + 2000;
        const a = 1 / (1 + TWO_PI * damp / sr);
        d[i] = ((r() * 2 - 1) * env - d[i - 1] * (1 - a)) * (i < pre + fade ? (i - pre) / fade : 1);
      }
    }
    return buf;
  });
}

export function tapeCurve(k = 2.1, b = 0.07) {
  const n = 4097;
  const c = new Float32Array(n);
  const off = Math.tanh(k * b);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = (Math.tanh(k * (x + b)) - off) / k;
  }
  return c;
}

export function clipCurve() {
  const n = 2049;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    c[i] = ax < 0.8 ? x : Math.sign(x) * (0.8 + 0.15 * Math.tanh((ax - 0.8) * 6));
  }
  return c;
}

export function silentWavUrl() {
  const sr = 8000;
  const n = sr;
  const bytes = 44 + n * 2;
  const buf = new ArrayBuffer(bytes);
  const v = new DataView(buf);
  const w = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, bytes - 8, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, n * 2, true);
  const u8 = new Uint8Array(buf);
  let b64 = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < u8.length; i += 3) {
    const a = u8[i];
    const b = i + 1 < u8.length ? u8[i + 1] : 0;
    const c = i + 2 < u8.length ? u8[i + 2] : 0;
    b64 += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] + (i + 1 < u8.length ? chars[((b & 15) << 2) | (c >> 6)] : "=") + (i + 2 < u8.length ? chars[c & 63] : "=");
  }
  return "data:audio/wav;base64," + b64;
}

export function createRegistry() {
  const live = new Set();
  return {
    add(voice) {
      live.add(voice);
      const end = () => {
        live.delete(voice);
        for (const n of voice.all || []) {
          try {
            n.disconnect();
          } catch {
            /* already gone */
          }
        }
      };
      if (voice.src) {
        for (const s of voice.src) {
          s.onended = end;
        }
      }
      return voice;
    },
    stop(t) {
      for (const v of [...live]) {
        for (const s of v.src || []) {
          try {
            s.stop(t);
          } catch {
            /* not started */
          }
        }
        v.end = t;
      }
    },
    get size() {
      return live.size;
    },
    clear() {
      this.stop(0);
      live.clear();
    },
  };
}
