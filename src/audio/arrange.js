import { rng, hash } from "../engine/core.js";
import { PROGRESSIONS, expand, relatedKey, randomKey, keyName } from "./harmony.js";
import { GROOVES } from "./rhythm.js";
import { makeMotif } from "./melody.js";

const PLACES = [
  "east passage", "the harbor", "the wharf", "the spit", "the cove", "the channel",
  "the pier", "the gut", "the breakwater", "the boatyard", "the fish house",
  "the dock", "the reach", "the point", "the ledges", "the basin",
];
const THINGS = [
  "lobster trap", "skiff", "foghorn", "buoy", "oilskin", "dinghy", "bait shack",
  "piling", "lantern", "dory", "clam rake", "dock line", "chimney", "shingles",
  "kettle", "gaff", "mooring", "oars", "saltbox", "window light",
];
const WEATHER = ["fog", "mist", "salt air", "drizzle", "the tide", "harbor haze", "night wind"];
const NOUNS = [
  "lullaby", "reverie", "echoes", "letters", "headlights", "reflections",
  "night watch", "slow dance", "cassettes", "afterglow", "quiet hours",
  "footsteps", "tape hiss", "postcards", "half-light", "nocturne", "goodnights",
  "pocket change", "open windows", "loose ends", "paper boats", "warm static",
];
const ADJS = [
  "sleepy", "hazy", "quiet", "dusty", "faded", "soft", "slow", "warm",
  "lonely", "gentle", "amber", "misty", "drowsy", "mellow", "wistful",
  "lazy", "hushed", "tender", "dreamy", "foggy", "late", "little", "golden",
];

const TEMPLATES = [
  (r) => `${pick(r, ADJS)} ${pick(r, NOUNS)}`,
  (r) => `${pick(r, THINGS)}, ${pick(r, PLACES)}`,
  (r) => `${pick(r, WEATHER)} over ${pick(r, PLACES)}`,
  (r) => `${pick(r, PLACES)} ${pick(r, NOUNS)}`,
  (r) => `${pick(r, ADJS)} ${pick(r, THINGS)}`,
  (r) => `${pick(r, NOUNS)} on ${pick(r, PLACES)}`,
];

function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}

export function makeTitle(r) {
  let s = TEMPLATES[Math.floor(r() * TEMPLATES.length)](r);
  if (s.length > 32) s = s.slice(0, 32).trim();
  return s.toLowerCase();
}

export function stream(seed, k) {
  return rng((hash(seed, k) * 0xffffffff) >>> 0);
}

export const ENERGIES = ["chill", "balanced", "upbeat"];
export const BANDS = ["full", "no-drums", "keys"];

export function normVibe(v) {
  const energy = ENERGIES.includes(v && v.energy) ? v.energy : "balanced";
  const band = BANDS.includes(v && v.band) ? v.band : "full";
  return { energy, band };
}

const BY_ENERGY = {
  chill: { bpm: [60, 72], swing: [56, 64], lag: [0.012, 0.022], drums: 0.85, lead: 0.5, twoBar: 0.5 },
  balanced: { bpm: [68, 86], swing: [54, 62], lag: [0.008, 0.018], drums: 1, lead: 0.62, twoBar: 0.3 },
  upbeat: { bpm: [80, 94], swing: [52, 58], lag: [0.004, 0.012], drums: 1, lead: 0.8, twoBar: 0.15 },
};

export function bandLayers(layers, band) {
  if (band === "no-drums") return { ...layers, kit: false };
  if (band === "keys") return { ...layers, kit: false, bass: "none", lead: false, level: 1.41 };
  return { ...layers, kit: true, level: layers.level || 1 };
}

function pickProg(list, r) {
  return expand(list[Math.floor(r() * list.length)]);
}

export function planTrack(seed, { scene, prevKey, vibe } = {}) {
  const v = normVibe(vibe);
  const E = BY_ENERGY[v.energy];
  const rH = stream(seed, 1);
  const rR = stream(seed, 2);
  const rM = stream(seed, 3);
  const rA = stream(seed, 4);
  const rT = stream(seed, 5);
  const key = prevKey ? relatedKey(prevKey, rH) : randomKey(rH);
  const pool = PROGRESSIONS[key.mode];
  const twoBar = rH() < E.twoBar;
  let progA = pickProg(pool, rH);
  let progB = rH() < 0.6 ? pickProg(pool, rH) : progA;
  if (twoBar) {
    const stretch = (p) => expand(p.chords.map((c) => [c.root, c.q, c.beats * 2]));
    progA = stretch(progA);
    progB = stretch(progB);
  }
  const bpm = E.bpm[0] + rR() * (E.bpm[1] - E.bpm[0]);
  const swing = E.swing[0] + rR() * (E.swing[1] - E.swing[0]);
  const snareLag = E.lag[0] + rR() * (E.lag[1] - E.lag[0]);
  const pattern = GROOVES[Math.floor(rR() * GROOVES.length)];
  const motif = makeMotif(rM, key);
  const leadOn = rA() < E.lead;
  const city = (scene && scene.name) || "East Passage";
  const title = makeTitle(rT);

  const A = { ep: "comp", bass: "kick", drums: pattern, kit: true, lead: false, hatsFirst: false, dipLast: rA() < 0.25, level: 1 };
  const B = { ...A, lead: leadOn, hatsFirst: rA() < 0.3 };
  const intro = { ep: "intro", bass: rA() < 0.5 ? "last" : "none", drums: rA() < 0.5 ? pattern : "none", kit: true, lead: false, hatsFirst: false, dipLast: false, level: 1 };
  const brk = { ep: "whole", bass: rA() < 0.5 ? "whole" : "none", drums: rA() < 0.6 ? "rim" : "none", kit: true, lead: rA() < 0.4, hatsFirst: false, dipLast: false, level: 0.9 };
  const outro = { ep: "outro", bass: "outro", drums: pattern, kit: true, lead: false, hatsFirst: false, dipLast: false, level: 1 };

  const templates = [
    [
      { name: "intro", bars: 4, prog: "A", layers: intro },
      { name: "A", bars: 8, prog: "A", layers: A },
      { name: "A", bars: 8, prog: "A", layers: { ...A, lead: leadOn } },
      { name: "B", bars: 8, prog: "B", layers: B },
      { name: "break", bars: 4, prog: "A", layers: brk },
      { name: "A", bars: 8, prog: "A", layers: { ...A, lead: leadOn } },
      { name: "B", bars: 8, prog: "B", layers: B },
      { name: "outro", bars: 4, prog: "final", layers: outro },
    ],
    [
      { name: "intro", bars: 2, prog: "A", layers: intro },
      { name: "A", bars: 8, prog: "A", layers: A },
      { name: "B", bars: 8, prog: "B", layers: B },
      { name: "A", bars: 8, prog: "A", layers: { ...A, lead: leadOn } },
      { name: "break", bars: 8, prog: "A", layers: brk },
      { name: "B", bars: 8, prog: "B", layers: B },
      { name: "A", bars: 8, prog: "A", layers: { ...A, lead: leadOn } },
      { name: "outro", bars: 4, prog: "final", layers: outro },
    ],
  ];
  let sections = templates[Math.floor(rA() * templates.length)];
  const barDur = (60 / bpm) * 4;
  const dur = () => sections.reduce((s, x) => s + x.bars, 0) * barDur;
  while (dur() < 150) {
    sections = [
      ...sections.slice(0, -1),
      { name: "B", bars: 8, prog: "B", layers: B },
      { name: "A", bars: 8, prog: "A", layers: { ...A, lead: leadOn } },
      sections[sections.length - 1],
    ];
    if (dur() > 240) break;
  }

  const nextSeed = (hash(seed, 7919) * 0xffffffff) >>> 0;
  return {
    seed,
    nextSeed,
    title,
    city,
    vibe: v,
    bpm,
    swing,
    snareLag,
    key,
    keyName: keyName(key),
    progA,
    progB,
    drums: { pattern, kit: "soft", level: E.drums },
    ep: { vel: 0.72, strum: 0.012 + rA() * 0.018, push: v.energy === "upbeat" ? 0.35 : 0.18, comp: { hold: 0.4, charleston: 0.3, pulse: 0.3 } },
    motif,
    lead: leadOn,
    tone: v.energy === "chill" ? 5200 : v.energy === "upbeat" ? 8200 : 6800,
    wowCents: v.energy === "chill" ? 9 : 6,
    dust: 0.7 + rA() * 0.6,
    sections,
    duration: dur(),
  };
}
