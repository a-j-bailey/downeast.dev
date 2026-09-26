import { clamp } from "../engine/core.js";
import { hold, createRegistry } from "./dsp.js";
import { spell, voice, bassNote } from "./harmony.js";
import { barHits, swing, COMPS } from "./rhythm.js";
import { phrase } from "./melody.js";
import { planTrack, stream, normVibe, bandLayers } from "./arrange.js";
import { createEP, createBass, createKit, createLead, fadeOut } from "./instruments.js";

const TRACK_GAIN = 0.48;
const VINYL_BOOST = 1.5;

export function createBarState(plan) {
  const map = [];
  plan.sections.forEach((s, si) => {
    const L = bandLayers(s.layers, plan.vibe.band);
    for (let j = 0; j < s.bars; j++) {
      map.push({ si, sec: s.name, j, n: s.bars, prog: s.prog, L, prev: plan.sections[si - 1]?.name || null });
    }
  });
  return {
    map,
    rH: stream(plan.seed, 11),
    rR: stream(plan.seed, 12),
    rM: stream(plan.seed, 13),
    rU: stream(plan.seed, 16),
    prevVoicing: null,
    prevBass: 40,
    pushed: -1,
  };
}

function chordsIn(prog, j) {
  const b0 = (j * 4) % prog.beats;
  const out = [];
  for (const c of prog.chords) {
    const s = Math.max(c.start, b0);
    const e = Math.min(c.start + c.beats, b0 + 4);
    if (e > s) out.push({ root: c.root, q: c.q, start: s - b0, beats: e - s, onset: c.start >= b0 });
  }
  return out;
}

export function barChords(plan, st, i) {
  const b = st.map[Math.min(i, st.map.length - 1)];
  if (b.prog === "final") {
    if (b.j < 2) return chordsIn(plan.progA, b.j);
    const q = plan.key.mode === "minor" ? "m9" : "maj9";
    return [{ root: 0, q, start: 0, beats: 4, onset: b.j === 2 }];
  }
  return chordsIn(b.prog === "B" ? plan.progB : plan.progA, b.j);
}

const pickComp = (w, r) => {
  const tot = w.hold + w.charleston + w.pulse;
  let u = r() * tot;
  return (u -= w.hold) < 0 ? "hold" : (u -= w.charleston) < 0 ? "charleston" : "pulse";
};

export function planBar(plan, i, st) {
  const b = st.map[i];
  const L = b.L;
  const sd = 60 / plan.bpm / 4;
  const bar0 = i * 16 * sd;
  const barDur = 16 * sd;
  const ev = [];
  const gauss = () => (st.rU() + st.rU() + st.rU() - 1.5) * 2;
  const at = (s, sigma, lag = 0) => Math.max(0, bar0 + s * sd + swing(s, sd, plan.swing) + lag + gauss() * sigma);
  const vh = (v) => clamp(v * (1 + (st.rU() * 2 - 1) * 0.08), 0.05, 1);
  const chords = barChords(plan, st, i);
  const nextChords = i + 1 < st.map.length ? barChords(plan, st, i + 1) : null;

  const fx = (type, v, tau = 1, dt = 0) => ev.push({ t: bar0 + dt, k: "fx", fx: type, v, tau, bar: i });
  if (i === 0) {
    fx("dust", plan.dust);
    fx("tone", 900, 0.02);
    fx("vinyl", VINYL_BOOST, 0.5);
  }
  if (b.sec === "intro") fx("tone", 900 * Math.pow(plan.tone / 900, (b.j + 1) / b.n), barDur / 3, i === 0 ? 0.12 : 0);
  else if (b.j === 0 && b.sec === "break") fx("tone", 1800, 0.4);
  else if (b.j === 0 && b.sec !== "outro") fx("tone", plan.tone * (0.92 + st.rH() * 0.16), 0.4);
  if (b.sec === "outro" && b.j === b.n - 2) fx("tone", 700, barDur * 0.6);

  const hits = [];
  const vel = plan.ep.vel;
  if (L.ep === "intro" || L.ep === "whole") {
    for (const c of chords) hits.push([c.start * 4, c.beats * 4, c, L.ep === "intro" ? 0.85 : 0.8, 0.12]);
  } else if (L.ep === "outro") {
    if (b.j < 2) for (const c of chords) hits.push([c.start * 4, c.beats * 4, c, 0.9, 0.1]);
    else if (b.j === 2) hits.push([0, (b.n - 2) * 16, chords[0], 0.85, 0.9]);
  } else {
    const cells = COMPS[pickComp(plan.ep.comp, st.rH)];
    cells.forEach(([s, len], k) => hits.push([s, k === cells.length - 1 ? 16 - s : len, chords[0], k ? 0.9 : 1, 0.08]));
  }
  for (const [s, len, c, vs, rel] of hits) {
    const v = voice(spell(plan.key, c), st.prevVoicing);
    st.prevVoicing = v;
    ev.push({ t: at(s, 0.004), k: "ep", notes: v, vel: vh(vel * vs), dur: Math.max(0.1, len * sd - 0.03), strum: plan.ep.strum, rel, bar: i });
  }

  const dh = barHits(plan, { sec: b.sec, j: b.j, n: b.n, drums: L.drums, hatsFirst: L.hatsFirst }, st.rR);
  for (const h of dh.hits) {
    const lag = h.v === "snare" || h.v === "rim" ? plan.snareLag : 0;
    if (L.kit) ev.push({ t: at(h.s, 0.003, lag), k: h.v, vel: vh(h.vel), open: !!h.open, ghost: !!h.ghost, bar: i });
  }

  const bm = L.bass;
  const bassOn = bm === "kick" || bm === "whole" || (bm === "last" && b.j === b.n - 1) || (bm === "outro" && b.j < 3);
  if (bassOn) {
    const kicks = dh.hits.filter((h) => h.v === "kick");
    const roots = kicks.length ? kicks : [{ s: 0 }];
    for (const k of roots) {
      const c = chords.find((ch) => k.s >= ch.start * 4 && k.s < (ch.start + ch.beats) * 4) || chords[0];
      const midi = bassNote(plan.key.tonic + c.root, st.prevBass);
      st.prevBass = midi;
      ev.push({ t: at(k.s, 0.004, 0.003), k: "bass", midi, vel: vh(0.85), dur: bm === "whole" ? barDur * 0.9 : sd * 3, bar: i });
    }
  }

  if (L.lead && plan.motif) {
    const notes = phrase(plan.motif, chords, plan.key, st.rM, b.sec === "B");
    for (const n of notes) {
      ev.push({ t: at(n.s, 0.008), k: "lead", midi: n.midi, vel: vh(0.7), dur: n.dur * sd, bar: i });
    }
  }
  return ev;
}

export function createEngine(ac, mixer, { scene, vibe, lite, onTrack } = {}) {
  let plan = null;
  let st = null;
  let inst = null;
  let trackStart = 0;
  let nextBar = 0;
  let queue = [];
  let vibeNow = normVibe(vibe);
  let sceneNow = scene;
  const dry = ac.createGain();
  const wet = ac.createGain();
  dry.gain.value = TRACK_GAIN;
  wet.gain.value = TRACK_GAIN * 0.35;
  dry.connect(mixer.musicIn);
  wet.connect(mixer.revIn);
  const registry = createRegistry();

  function buildInstruments() {
    if (inst) inst.dispose();
    inst = {
      ep: createEP(ac, dry, wet, { cap: lite ? 10 : 14 }),
      bass: createBass(ac, dry),
      kit: createKit(ac, dry, wet),
      lead: createLead(ac, dry, wet),
      dispose() {
        this.ep.dispose();
        this.bass.dispose();
        this.kit.dispose();
        this.lead.dispose();
      },
    };
  }

  function startPlan(seed, t) {
    plan = planTrack(seed, { scene: sceneNow, prevKey: plan && plan.key, vibe: vibeNow });
    st = createBarState(plan);
    nextBar = 0;
    trackStart = t;
    buildInstruments();
    queue = [planTrack(plan.nextSeed, { scene: sceneNow, prevKey: plan.key, vibe: vibeNow })];
    if (onTrack) onTrack(plan);
  }

  function schedule(ev, when) {
    switch (ev.k) {
      case "ep":
        inst.ep.play(when, ev.notes, ev.vel, ev.dur, ev.strum, ev.rel);
        break;
      case "kick":
        inst.kit.kick(when, ev.vel);
        break;
      case "snare":
        inst.kit.snare(when, ev.vel, ev.ghost);
        break;
      case "hat":
        inst.kit.hat(when, ev.vel, ev.open);
        break;
      case "rim":
        inst.kit.rim(when, ev.vel);
        break;
      case "bass":
        inst.bass.play(when, ev.midi, ev.vel, ev.dur);
        break;
      case "lead":
        inst.lead.play(when, ev.midi, ev.vel, ev.dur);
        break;
      case "fx":
        if (ev.fx === "tone") {
          hold(mixer.tone.frequency, when);
          mixer.tone.frequency.setTargetAtTime(ev.v, when, ev.tau || 0.4);
        } else if (ev.fx === "dust" && mixer.crackleGain) {
          hold(mixer.crackleGain.gain, when);
          mixer.crackleGain.gain.setTargetAtTime(0.045 * ev.v, when, 0.4);
        } else if (ev.fx === "vinyl") {
          hold(mixer.vinyl.gain, when);
          mixer.vinyl.gain.setTargetAtTime(ev.v, when, ev.tau || 0.4);
        }
        break;
      default: {
        const _e = ev.k;
        void _e;
      }
    }
  }

  function advance(until) {
    if (!plan) return;
    const barDur = (60 / plan.bpm) * 4;
    while (nextBar < st.map.length) {
      const barT = trackStart + nextBar * barDur;
      if (barT > until + 0.05) break;
      const events = planBar(plan, nextBar, st);
      for (const ev of events) {
        const when = trackStart + ev.t;
        if (when >= ac.currentTime - 0.02) schedule(ev, when);
      }
      nextBar++;
    }
    if (nextBar >= st.map.length && trackStart + plan.duration < until + 0.6) {
      const nxt = queue[0] || planTrack(plan.nextSeed, { scene: sceneNow, prevKey: plan.key, vibe: vibeNow });
      fadeOut(dry, ac.currentTime, 0.08);
      const t0 = Math.max(ac.currentTime + 0.45, trackStart + plan.duration + 0.25);
      startPlan(nxt.seed, t0);
      dry.gain.setValueAtTime(0, t0);
      dry.gain.setTargetAtTime(TRACK_GAIN, t0, 0.2);
    }
  }

  return {
    start(seed, t) {
      startPlan(seed, t);
    },
    next(seed) {
      fadeOut(dry, ac.currentTime, 0.08);
      fadeOut(wet, ac.currentTime, 0.08);
      const s = seed != null ? seed : (queue[0] && queue[0].seed) || (Math.random() * 0xffffffff) >>> 0;
      startPlan(s, ac.currentTime + 0.55);
      dry.gain.setValueAtTime(0.001, ac.currentTime + 0.55);
      dry.gain.setTargetAtTime(TRACK_GAIN, ac.currentTime + 0.55, 0.18);
    },
    advance,
    key: () => (plan ? plan.key : null),
    get queue() {
      return queue.map((p) => ({
        id: p.seed,
        title: p.title,
        city: p.city,
        bpm: Math.round(p.bpm),
        key: p.keyName,
        duration: p.duration,
        energy: p.vibe.energy,
        band: p.vibe.band,
      }));
    },
    setScene(scene) {
      sceneNow = scene;
    },
    setVibe(v) {
      vibeNow = normVibe(v);
      if (plan) {
        queue = [planTrack(plan.nextSeed, { scene: sceneNow, prevKey: plan.key, vibe: vibeNow })];
        if (vibeNow.band !== plan.vibe.band && st) {
          for (let i = nextBar; i < st.map.length; i++) st.map[i].L = bandLayers(plan.sections[st.map[i].si].layers, vibeNow.band);
        }
        plan.vibe = vibeNow;
      }
    },
    dispose() {
      if (inst) inst.dispose();
      registry.clear();
    },
  };
}
