const mod12 = (n) => ((n % 12) + 12) % 12;

export const QUALITIES = {
  maj9: [0, 4, 7, 11, 14],
  maj7: [0, 4, 7, 11],
  "69": [0, 4, 7, 9, 14],
  m9: [0, 3, 7, 10, 14],
  m7: [0, 3, 7, 10],
  "13": [0, 4, 10, 14, 21],
  "9": [0, 4, 7, 10, 14],
  "7b9": [0, 4, 7, 10, 13],
  m7b5: [0, 3, 6, 10],
  "6": [0, 4, 7, 9],
  sus4: [0, 5, 7, 10],
};

export const PROGRESSIONS = {
  major: [
    [[2, "m9", 4], [7, "13", 4], [0, "maj9", 4], [0, "maj9", 4]],
    [[0, "maj7", 4], [9, "m9", 4], [2, "m9", 4], [7, "13", 4]],
    [[5, "maj7", 4], [4, "m7", 4], [2, "m9", 4], [0, "maj9", 4]],
    [[5, "maj9", 4], [5, "m9", 4], [4, "m7", 4], [9, "m9", 4]],
    [[0, "maj9", 8], [5, "maj9", 8]],
    [[0, "maj9", 4], [4, "m7", 4], [5, "maj7", 4], [5, "6", 4]],
  ],
  minor: [
    [[0, "m9", 4], [5, "m9", 4], [10, "13", 4], [3, "maj9", 4]],
    [[0, "m9", 8], [5, "9", 8]],
    [[8, "maj9", 4], [10, "6", 4], [0, "m9", 4], [0, "m9", 4]],
    [[2, "m7b5", 4], [7, "7b9", 4], [0, "m9", 4], [0, "m9", 4]],
    [[0, "m9", 4], [3, "maj7", 4], [8, "maj7", 4], [7, "sus4", 4]],
    [[0, "m9", 4], [8, "maj7", 4], [5, "m9", 4], [7, "7b9", 4]],
  ],
};

export function expand(chords) {
  let start = 0;
  const out = chords.map(([root, q, beats]) => {
    const c = { root, q, beats, start };
    start += beats;
    return c;
  });
  return { chords: out, beats: start };
}

export function spell(key, chord) {
  const ivs = QUALITIES[chord.q] || QUALITIES.m9;
  return ivs.map((iv) => key.tonic + chord.root + iv);
}

export function voice(pcs, prev) {
  const tones = [...new Set(pcs.map(mod12))];
  const prefer = [3, 4, 10, 11, 2, 9, 7, 5, 0];
  const pick = [];
  for (const w of prefer) {
    const t = tones.find((pc) => pc === w);
    if (t != null && !pick.includes(t)) pick.push(t);
    if (pick.length >= 4) break;
  }
  for (const t of tones) {
    if (pick.length >= 4) break;
    if (!pick.includes(t)) pick.push(t);
  }
  const placed = pick.map((pc, i) => {
    let m = 50 + pc;
    if (i >= 2) m += 12;
    return m;
  }).sort((a, b) => a - b);
  for (let i = 1; i < placed.length; i++) {
    while (placed[i] <= placed[i - 1]) placed[i] += 12;
  }
  if (placed[placed.length - 1] > 78) {
    for (let i = placed.length - 1; i >= 0 && placed[placed.length - 1] > 78; i--) placed[i] -= 12;
  }
  if (!prev) return placed;
  const shifted = placed.map((m) => (Math.abs(m - 12 - prev[0]) < Math.abs(m - prev[0]) ? m - 12 : m));
  shifted.sort((a, b) => a - b);
  return shifted[0] >= 46 ? shifted : placed;
}

export function bassNote(pc, prev) {
  let m = 36 + mod12(pc);
  while (m < 33) m += 12;
  while (m > 47) m -= 12;
  if (prev != null && Math.abs(m + 12 - prev) < Math.abs(m - prev) && m + 12 <= 47) m += 12;
  if (prev != null && Math.abs(m - 12 - prev) < Math.abs(m - prev) && m - 12 >= 33) m -= 12;
  return m;
}

export function pentatonic(key) {
  const steps = key.mode === "minor" ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  return steps.map((s) => mod12(key.tonic + s));
}

export function relatedKey(prev, r) {
  const u = r();
  if (u < 0.15) return { ...prev };
  if (u < 0.55) {
    const shift = r() < 0.5 ? 5 : 7;
    return { tonic: mod12(prev.tonic + shift), mode: prev.mode };
  }
  if (u < 0.75) {
    return prev.mode === "minor"
      ? { tonic: mod12(prev.tonic + 3), mode: "major" }
      : { tonic: mod12(prev.tonic + 9), mode: "minor" };
  }
  return randomKey(r);
}

export function randomKey(r) {
  return { tonic: Math.floor(r() * 12), mode: r() < 0.55 ? "minor" : "major" };
}

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export function keyName(key) {
  return NAMES[key.tonic] + (key.mode === "minor" ? " minor" : " major");
}

export function snapToKey(hz, key) {
  if (!key) return hz;
  const midi = ftomFrom(hz);
  const scale = pentatonic(key);
  let best = midi;
  let bestD = 99;
  for (let oct = 2; oct <= 6; oct++) {
    for (const pc of scale) {
      const m = oct * 12 + pc;
      const d = Math.abs(m - midi);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
  }
  return 440 * Math.pow(2, (best - 69) / 12);
}

function ftomFrom(f) {
  return 69 + 12 * Math.log2(f / 440);
}
