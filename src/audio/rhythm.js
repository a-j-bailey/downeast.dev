export function swing(step, stepDur, pct) {
  if (step % 2 === 0) return 0;
  return ((pct - 50) / 50) * stepDur;
}

const PATTERNS = {
  boom: { K: [0, 10], S: [4, 12], H: [0, 2, 4, 6, 8, 10, 12, 14] },
  bounce: { K: [0, 7, 10], S: [4, 12], H: [0, 2, 4, 6, 8, 10, 12, 14, 15] },
  lazy: { K: [0, 6], S: [4, 12], H: [0, 2, 4, 6, 8, 10, 12], O: [14] },
  half: { K: [0, 6, 10], S: [8], H: [0, 2, 4, 6, 8, 10, 12, 14], R: [12] },
  rim: { K: [0, 10], R: [4, 12], H: [0, 4, 8, 12] },
  shuf: { K: [0, 3, 10], S: [4, 12, 14], H: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], G: [7, 14] },
};

export const GROOVES = Object.keys(PATTERNS);

export const COMPS = {
  hold: [[0, 16]],
  charleston: [[0, 6], [6, 10]],
  pulse: [[0, 8], [8, 8]],
};

export function barHits(plan, bar, r) {
  const hits = [];
  if (bar.drums === "none") return { hits };
  const name = bar.drums === "rim" ? "rim" : plan.drums.pattern;
  const p = PATTERNS[name] || PATTERNS.boom;
  const hatAcc = [1, 0.45, 0.7, 0.45];
  const lv = plan.drums.level;
  if (bar.hatsFirst && bar.j === 0) {
    for (const s of p.H || []) hits.push({ s, v: "hat", vel: 0.5 * lv * hatAcc[s % 4] });
    return { hits };
  }
  for (const s of p.K || []) hits.push({ s, v: "kick", vel: lv });
  for (const s of p.S || []) {
    const ghost = (p.G || []).includes(s);
    hits.push({ s, v: "snare", vel: (ghost ? 0.3 : 1) * lv, ghost });
  }
  for (const s of p.R || []) hits.push({ s, v: "rim", vel: 0.9 * lv });
  for (const s of p.H || []) hits.push({ s, v: "hat", vel: 0.85 * lv * hatAcc[s % 4] });
  for (const s of p.O || []) hits.push({ s, v: "hat", vel: 0.7 * lv, open: true });

  const last = bar.j === bar.n - 1;
  if (last && r() < (bar.n >= 8 ? 0.5 : 0.2)) {
    const fill = Math.floor(r() * 4);
    if (fill === 0) {
      [12, 13, 14, 15].forEach((s, i) => hits.push({ s, v: "snare", vel: [0.9, 0.3, 0.45, 0.65][i] * lv }));
    } else if (fill === 1) {
      return { hits: hits.filter((h) => h.s < 12) };
    } else if (fill === 2) {
      hits.push({ s: 13, v: "kick", vel: 0.7 * lv }, { s: 15, v: "kick", vel: 0.55 * lv });
    } else {
      hits.push({ s: 14, v: "hat", vel: 0.8 * lv, open: true });
    }
  }
  return { hits };
}
