import { LOOP, rng, clamp } from "../engine/core.js";
import { powerCurve, createRegistry, hold } from "./dsp.js";
import { audioTimeIn } from "./context.js";
import { BEDS, EVENTS, SOUND_NAMES } from "./sounds.js";

const TRIM_MAX = 2;
const trimOf = (v) => (Number.isFinite(v) ? clamp(v, 0, TRIM_MAX) : 1);

export function soundsOf(scene) {
  const out = [];
  const add = (id, kind) => {
    if (!out.some((s) => s.id === id)) out.push({ id, kind, name: SOUND_NAMES[id] || id });
  };
  for (const [id, lv] of Object.entries((scene && scene.ambience) || {})) {
    if (BEDS[id] && lv > 0) add(id, "bed");
  }
  for (const e of (scene && scene.events) || []) {
    if (e && EVENTS[e.type] && Number.isFinite(e.t)) add(e.type, "event");
  }
  return out;
}

const told = new Set();
function unknown(kind, name, sceneId) {
  const k = `${kind}:${name}`;
  if (told.has(k)) return;
  told.add(k);
  console.info(`[audio] ignoring unknown ambience ${kind} "${name}" (scene "${sceneId}")`);
}

const mod = (a, n) => ((a % n) + n) % n;

function unwrap(time) {
  let last = null;
  let off = 0;
  return () => {
    const v = +time() || 0;
    if (last !== null && v < last - LOOP / 2) off += LOOP;
    last = v;
    return v + off;
  };
}

export function createAmbience(ac, mixer, { key = () => null, registry = createRegistry(), seed = 1, trims: initialTrims = {} } = {}) {
  const r = rng(seed >>> 0);
  const trims = { ...initialTrims };
  let set = null;
  let leaving = [];
  let n = 0;
  let time = () => ac.currentTime;

  function makeSet(scene, fade) {
    const now = ac.currentTime;
    const tag = `amb${++n}`;
    const fadeIn = ac.createGain();
    const fadeOut = ac.createGain();
    fadeIn.connect(fadeOut);
    fadeOut.connect(mixer.ambIn);
    if (fade > 0) {
      fadeIn.gain.value = 0;
      fadeIn.gain.cancelScheduledValues(now);
      fadeIn.gain.setValueCurveAtTime(powerCurve(true), now, fade);
    }
    const amb = (scene && scene.ambience) || {};
    const env = { registry, tag, key, echo: mixer.echoIn, r };
    const strips = new Map();
    const all = [fadeIn, fadeOut];
    for (const { id } of soundsOf(scene)) {
      const out = ac.createGain();
      const echo = ac.createGain();
      out.gain.value = echo.gain.value = trimOf(trims[id]);
      out.connect(fadeIn);
      echo.connect(mixer.echoIn);
      all.push(out, echo);
      strips.set(id, { out, echo, env: { ...env, echo } });
    }
    const busVoice = registry.add({ src: [], all, tag: `${tag}:bus` });
    const beds = [];
    for (const [name, lv] of Object.entries(amb)) {
      if (!BEDS[name]) {
        unknown("bed", name, scene && scene.id);
        continue;
      }
      if (lv > 0) {
        const s = strips.get(name);
        beds.push(BEDS[name](ac, s.out, s.env, lv, now));
      }
    }
    const events = ((scene && scene.events) || []).filter((e) => {
      if (!e || !EVENTS[e.type]) {
        unknown("event", e && e.type, scene && scene.id);
        return false;
      }
      return Number.isFinite(e.t);
    });
    return { scene, tag, strips, fadeIn, fadeOut, busVoice, beds, events, keys: new Set(), killAt: Infinity };
  }

  function leave(s, fade) {
    const now = ac.currentTime;
    const f = Math.max(0.05, fade);
    s.fadeOut.gain.cancelScheduledValues(now);
    s.fadeOut.gain.setValueCurveAtTime(powerCurve(false), now, f);
    s.killAt = now + f + 0.2;
    for (const b of s.beds) b.stop(s.killAt);
    leaving.push(s);
  }

  return {
    setScene(scene, timeFn, fade = 3) {
      time = unwrap(timeFn);
      if (set) leave(set, fade);
      set = makeSet(scene, set ? fade : 0);
    },
    setTrim(id, v) {
      trims[id] = trimOf(v);
      const apply = (s) => {
        const st = s.strips.get(id);
        if (!st) return;
        const t = ac.currentTime;
        hold(st.out.gain, t);
        hold(st.echo.gain, t);
        st.out.gain.setTargetAtTime(trims[id], t, 0.05);
        st.echo.gain.setTargetAtTime(trims[id], t, 0.05);
      };
      if (set) apply(set);
      for (const s of leaving) apply(s);
    },
    advance(until) {
      const now = ac.currentTime;
      leaving = leaving.filter((s) => {
        if (now < s.killAt) return true;
        s.busVoice.end = now;
        return false;
      });
      if (!set) return;
      for (const b of set.beds) b.advance(until, now);
      const tScene = time();
      const loopT = ((tScene % LOOP) + LOOP) % LOOP;
      for (let i = 0; i < set.events.length; i++) {
        const ev = set.events[i];
        const dlt = mod(ev.t - loopT, LOOP);
        if (dlt > until - now + 0.05) continue;
        const cycleN = Math.floor((tScene + dlt) / LOOP);
        const k = `${i}:${cycleN}`;
        if (set.keys.has(k)) continue;
        set.keys.add(k);
        const when = audioTimeIn(ac, dlt);
        const strip = set.strips.get(ev.type);
        if (!strip) continue;
        EVENTS[ev.type](ac, strip.out, when, ev, strip.env);
      }
    },
    resync() {
      if (!set) return;
      set.keys.clear();
    },
    dispose() {
      if (set) leave(set, 0.05);
      set = null;
    },
  };
}
