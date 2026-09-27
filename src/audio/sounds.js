import { clamp } from "../engine/core.js";
import { noise, drops, hold } from "./dsp.js";
import { snapToKey } from "./harmony.js";

export const BED_MAX = { rain: 0.55, wind: 1.6, water: 1.05, waves: 0.5 };
export const EVENT_GAIN = { bell: 0.16, chime: 0.22, horn: 0.4, gull: 0.09, splash: 0.28, boat: 0.32 };
export const SOUND_NAMES = {
  rain: "Rain",
  wind: "Wind",
  water: "Water",
  waves: "Waves",
  bell: "Buoy",
  chime: "Chimes",
  horn: "Horn",
  gull: "Gulls",
  splash: "Splashes",
  boat: "Ferry",
};

function kit(ac, env) {
  const nodes = [];
  const src = [];
  const procs = [];
  const r = env.r;
  const N = (n) => (nodes.push(n), n);
  const k = {
    r,
    nodes,
    src,
    G: (v = 1) => {
      const g = N(ac.createGain());
      g.gain.value = v;
      return g;
    },
    F: (type, f, Q) => {
      const b = N(ac.createBiquadFilter());
      b.type = type;
      b.frequency.value = f;
      if (Q != null) b.Q.value = Q;
      return b;
    },
    P: (p = 0) => {
      const s = N(ac.createStereoPanner());
      s.pan.value = clamp(p, -1, 1);
      return s;
    },
    O: (type, f) => {
      const o = N(ac.createOscillator());
      o.type = type;
      o.frequency.value = f;
      src.push(o);
      return o;
    },
    loop: (buf, rate = 1) => {
      const s = N(ac.createBufferSource());
      s.buffer = buf;
      s.loop = true;
      s.playbackRate.value = rate;
      src.push(s);
      return s;
    },
    noise: (type, rate = 1) => k.loop(noise(ac, type), rate),
    every(t0, gap, fn) {
      procs.push({ next: t0 + gap() * r(), gap, fn });
    },
    start(t0) {
      for (const s of src) {
        if (s.buffer) s.start(t0, r() * s.buffer.duration);
        else s.start(t0);
      }
    },
    advance(until, now) {
      for (const p of procs) {
        if (p.next < now) p.next = now;
        while (p.next < until) {
          p.fn(p.next);
          p.next += Math.max(0.02, p.gap());
        }
      }
    },
    stop(t) {
      for (const s of src) {
        try {
          s.stop(t);
        } catch {
          /* not started */
        }
      }
    },
  };
  return k;
}

function bed(ac, out, env, name, level, t0, build) {
  const k = kit(ac, env);
  const g = k.G(clamp(level, 0, 1) * BED_MAX[name]);
  g.connect(out);
  build(k, g, clamp(level, 0, 1));
  k.start(t0);
  const v = env.registry.add({ src: k.src, all: k.nodes, start: t0, end: Infinity, tag: `${env.tag}:bed` });
  return {
    name,
    level(x, t) {
      hold(g.gain, t);
      g.gain.setTargetAtTime(clamp(x, 0, 1) * BED_MAX[name], t, 0.5);
    },
    advance: (until, now) => k.advance(until, now),
    stop(t) {
      k.stop(t);
      v.end = t;
    },
  };
}

const span = (r, a, b) => a + r() * (b - a);

export const BEDS = {
  rain(ac, out, env, level, t0) {
    return bed(ac, out, env, "rain", level, t0, (k, g, lv) => {
      const src = k.noise("pink");
      const hp = k.F("highpass", 380, 0.6);
      const lp = k.F("lowpass", 3200 + 4200 * lv, 0.5);
      const body = k.G(0.75);
      src.connect(hp);
      hp.connect(lp);
      lp.connect(body);
      body.connect(g);
      const dropsG = k.G(0.1);
      for (const [p, rate] of [[-0.5, 1], [0.5, 0.94]]) {
        const d = k.loop(drops(ac, lv), rate);
        const pan = k.P(p);
        d.connect(pan);
        pan.connect(dropsG);
      }
      dropsG.connect(g);
    });
  },
  wind(ac, out, env, level, t0) {
    return bed(ac, out, env, "wind", level, t0, (k, g) => {
      for (const pan of [-0.5, 0.5]) {
        const src = k.noise("brown");
        const bp = k.F("bandpass", 400, 3);
        const gg = k.G(0.6);
        const p = k.P(pan);
        src.connect(bp);
        bp.connect(gg);
        gg.connect(p);
        p.connect(g);
        k.every(t0, () => span(k.r, 2, 5), (t) => {
          bp.frequency.setTargetAtTime(span(k.r, 220, 880), t, 1.4);
          gg.gain.setTargetAtTime(span(k.r, 0.25, 1), t, 1.4);
        });
      }
    });
  },
  water(ac, out, env, level, t0) {
    return bed(ac, out, env, "water", level, t0, (k, g) => {
      const src = k.noise("brown");
      const bp = k.F("bandpass", 260, 0.8);
      const lp = k.F("lowpass", 680, 0.55);
      const gg = k.G(0.88);
      src.connect(bp);
      bp.connect(lp);
      lp.connect(gg);
      gg.connect(g);
      k.every(t0, () => span(k.r, 1.8, 3.8), (t) => {
        gg.gain.setTargetAtTime(span(k.r, 0.52, 0.94), t, 0.9);
        bp.frequency.setTargetAtTime(span(k.r, 200, 340), t, 1.2);
      });
    });
  },
  waves(ac, out, env, level, t0) {
    return bed(ac, out, env, "waves", level, t0, (k, g) => {
      const rumble = k.noise("brown");
      const lp = k.F("lowpass", 150, 0.7);
      const rg = k.G(0.45);
      rumble.connect(lp);
      lp.connect(rg);
      rg.connect(g);
      const wash = k.noise("pink");
      const f = k.F("lowpass", 500, 0.5);
      const ag = k.G(0);
      wash.connect(f);
      f.connect(ag);
      ag.connect(g);
      k.every(t0, () => span(k.r, 7, 11), (t) => {
        f.frequency.setValueAtTime(320, t);
        f.frequency.setTargetAtTime(880, t + 1.4, 0.9);
        f.frequency.setTargetAtTime(380, t + 4, 1.3);
        ag.gain.setTargetAtTime(0.42, t, 1.0);
        ag.gain.setTargetAtTime(0, t + 3.8, 1.6);
      });
    });
  },
};

export const EVENTS = {
  bell(ac, out, when, ev, env) {
    const f = snapToKey(168, env.key && env.key());
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = panOf(ev, 0.2);
    g.connect(p);
    p.connect(out);
    if (env.echo) g.connect(env.echo);
    const oscs = [];
    const ratios = [0.5, 1, 1.19, 1.5, 2, 2.5];
    const amps = [0.32, 1, 0.48, 0.28, 0.4, 0.18];
    const taus = [5.5, 3.8, 2.8, 2.3, 1.8, 1.1];
    ratios.forEach((rt, i) => {
      const o = ac.createOscillator();
      const ag = ac.createGain();
      o.frequency.value = f * rt;
      ag.gain.value = 0;
      o.connect(ag);
      ag.connect(g);
      o.start(when);
      o.stop(when + 8);
      ag.gain.setTargetAtTime(amps[i] * EVENT_GAIN.bell * (ev.gain || 1), when, 0.004);
      ag.gain.setTargetAtTime(0, when + 0.05, taus[i]);
      oscs.push(o, ag);
    });
    env.registry.add({ src: oscs.filter((n) => n.start), all: [...oscs, g, p], tag: `${env.tag}:bell` });
  },
  chime(ac, out, when, ev, env) {
    const key = env.key && env.key();
    const degrees = [4, 2, 0, 7];
    degrees.forEach((d, i) => {
      const t = when + i * 0.68;
      const f = snapToKey(440 * Math.pow(2, d / 12), key);
      const o = ac.createOscillator();
      const m = ac.createOscillator();
      const mg = ac.createGain();
      const g = ac.createGain();
      o.frequency.value = f;
      m.frequency.value = f * 3.4;
      mg.gain.value = f * 2;
      g.gain.value = 0;
      m.connect(mg);
      mg.connect(o.frequency);
      o.connect(g);
      g.connect(out);
      o.start(t);
      m.start(t);
      o.stop(t + 2);
      m.stop(t + 2);
      mg.gain.setTargetAtTime(f * 0.1, t, 0.55);
      g.gain.setTargetAtTime(EVENT_GAIN.chime * (ev.gain || 1), t, 0.01);
      g.gain.setTargetAtTime(0, t + 0.4, 0.5);
      env.registry.add({ src: [o, m], all: [o, m, mg, g], tag: `${env.tag}:chime` });
    });
  },
  horn(ac, out, when, ev, env) {
    const f = snapToKey(110, env.key && env.key());
    const g = ac.createGain();
    g.gain.value = 0;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 680;
    const a = ac.createOscillator();
    const b = ac.createOscillator();
    const c = ac.createOscillator();
    a.type = "sawtooth";
    b.type = "sawtooth";
    c.type = "square";
    a.frequency.value = f;
    b.frequency.value = f * 1.005;
    c.frequency.value = f * 2;
    const mix = ac.createGain();
    mix.gain.value = 0.18;
    a.connect(lp);
    b.connect(lp);
    c.connect(mix);
    mix.connect(lp);
    lp.connect(g);
    g.connect(out);
    a.start(when);
    b.start(when);
    c.start(when);
    a.stop(when + 3.2);
    b.stop(when + 3.2);
    c.stop(when + 3.2);
    g.gain.setTargetAtTime(EVENT_GAIN.horn * (ev.gain || 1), when, 0.12);
    g.gain.setTargetAtTime(EVENT_GAIN.horn * (ev.gain || 1), when + 1.6, 0.3);
    g.gain.setTargetAtTime(0, when + 2.2, 0.35);
    env.registry.add({ src: [a, b, c], all: [a, b, c, mix, lp, g], tag: `${env.tag}:horn` });
  },
  gull(ac, out, when, ev, env) {
    const r = env.r || Math.random;
    const n = r() < 0.22 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const t = when + i * (1.55 + r() * 0.7);
      const f0 = 620 + r() * 150;
      const fPeak = f0 * (1.07 + r() * 0.05);
      const fEnd = f0 * (0.56 + r() * 0.08);
      const body = ac.createOscillator();
      const rasp = ac.createOscillator();
      const raspG = ac.createGain();
      const mix = ac.createGain();
      const bp = ac.createBiquadFilter();
      const lp = ac.createBiquadFilter();
      const g = ac.createGain();
      const p = ac.createStereoPanner();
      const send = ac.createGain();
      body.type = "sine";
      rasp.type = "triangle";
      raspG.gain.value = 0.16;
      mix.gain.value = 1;
      bp.type = "bandpass";
      bp.frequency.value = 780;
      bp.Q.value = 1.05;
      lp.type = "lowpass";
      lp.frequency.value = 1380;
      lp.Q.value = 0.5;
      g.gain.value = 0;
      send.gain.value = 0.58;
      p.pan.value = panOf(ev, i ? 0.52 : -0.46);
      body.frequency.setValueAtTime(f0, t);
      body.frequency.setTargetAtTime(fPeak, t, 0.055);
      body.frequency.setTargetAtTime(fEnd, t + 0.18, 0.24);
      rasp.frequency.setValueAtTime(f0 * 1.012, t);
      rasp.frequency.setTargetAtTime(fPeak * 1.012, t, 0.055);
      rasp.frequency.setTargetAtTime(fEnd * 1.012, t + 0.18, 0.24);
      body.connect(mix);
      rasp.connect(raspG);
      raspG.connect(mix);
      mix.connect(bp);
      bp.connect(lp);
      lp.connect(g);
      g.connect(p);
      p.connect(out);
      if (env.echo) {
        g.connect(send);
        send.connect(env.echo);
      }
      const amp = EVENT_GAIN.gull * (ev.gain || 1) * (0.62 + r() * 0.22);
      g.gain.setTargetAtTime(amp, t, 0.055);
      g.gain.setTargetAtTime(amp * 0.38, t + 0.32, 0.16);
      g.gain.setTargetAtTime(0, t + 0.78, 0.3);
      body.start(t);
      rasp.start(t);
      body.stop(t + 1.4);
      rasp.stop(t + 1.4);
      env.registry.add({
        src: [body, rasp],
        all: [body, rasp, raspG, mix, bp, lp, g, p, send],
        tag: `${env.tag}:gull`,
      });
    }
  },
  splash(ac, out, when, ev, env) {
    const src = ac.createBufferSource();
    src.buffer = noise(ac, "pink");
    const bp = ac.createBiquadFilter();
    const lp = ac.createBiquadFilter();
    const g = ac.createGain();
    bp.type = "bandpass";
    bp.frequency.value = 380;
    bp.Q.value = 0.55;
    lp.type = "lowpass";
    lp.frequency.value = 820;
    g.gain.value = 0;
    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.start(when);
    src.stop(when + 0.7);
    bp.frequency.setTargetAtTime(260, when, 0.14);
    g.gain.setTargetAtTime(EVENT_GAIN.splash * (ev.gain || 1), when, 0.04);
    g.gain.setTargetAtTime(0, when + 0.22, 0.2);
    env.registry.add({ src: [src], all: [src, bp, lp, g], tag: `${env.tag}:splash` });
  },
  boat(ac, out, when, ev, env) {
    const dur = ev.dur || 14;
    const o = ac.createOscillator();
    const lp = ac.createBiquadFilter();
    const am = ac.createOscillator();
    const amg = ac.createGain();
    const g = ac.createGain();
    const p = ac.createStereoPanner();
    o.type = "square";
    o.frequency.value = 42;
    lp.type = "lowpass";
    lp.frequency.value = 160;
    am.frequency.value = 7;
    amg.gain.value = 0.4;
    g.gain.value = 0;
    const pans = Array.isArray(ev.pan) ? ev.pan : [panOf(ev, -0.6), panOf(ev, 0.6)];
    p.pan.setValueAtTime(pans[0], when);
    p.pan.linearRampToValueAtTime(pans[1], when + dur);
    am.connect(amg);
    amg.connect(g.gain);
    o.connect(lp);
    lp.connect(g);
    g.connect(p);
    p.connect(out);
    o.start(when);
    am.start(when);
    o.stop(when + dur + 0.5);
    am.stop(when + dur + 0.5);
    g.gain.setTargetAtTime(EVENT_GAIN.boat * (ev.gain || 1), when, dur * 0.15);
    g.gain.setTargetAtTime(0, when + dur * 0.7, dur * 0.12);
    env.registry.add({ src: [o, am], all: [o, lp, am, amg, g, p], tag: `${env.tag}:boat` });
  },
};

function panOf(ev, fallback) {
  if (typeof ev.pan === "number") return ev.pan;
  if (Number.isFinite(ev.x)) return clamp(ev.x / 240 - 1, -1, 1);
  return fallback;
}
