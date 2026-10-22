import { pentatonic } from "./harmony.js";

const CELLS = [
  [0, 3, 6, 8],
  [2, 4, 7],
  [0, 6, 10, 12, 14],
  [0, 4, 8, 11],
  [3, 6, 10],
];

export function makeMotif(r, key) {
  const scale = pentatonic(key);
  const cell = CELLS[Math.floor(r() * CELLS.length)];
  const n = 3 + Math.floor(r() * 4);
  const notes = [];
  let deg = Math.floor(r() * scale.length);
  for (let i = 0; i < n; i++) {
    const step = cell[i % cell.length];
    if (r() < 0.75) deg += r() < 0.5 ? 1 : -1;
    else deg += r() < 0.5 ? 2 : -2;
    deg = ((deg % scale.length) + scale.length) % scale.length;
    notes.push({ s: step, pc: scale[deg], hold: 2 + Math.floor(r() * 3) });
  }
  notes[notes.length - 1].hold = 4 + Math.floor(r() * 5);
  return notes;
}

export function phrase(motif, chords, key, r, variant) {
  const scale = pentatonic(key);
  const out = [];
  if (r() < 0.4) return out;
  const shift = variant ? 2 : 0;
  for (const n of motif) {
    let deg = scale.indexOf(n.pc);
    if (deg < 0) deg = 0;
    deg = (deg + shift) % scale.length;
    if (variant) deg = scale.length - 1 - deg;
    const chord = chords[0];
    const root = (key.tonic + (chord ? chord.root : 0) + 12) % 12;
    let pc = scale[deg];
    if (n.s === 0 || n.s === 8) pc = root;
    out.push({ s: n.s, midi: 67 + pc, dur: n.hold });
  }
  return out;
}
