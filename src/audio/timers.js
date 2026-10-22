export const FOCUS_PRESETS = [
  { id: "25/5", focus: 25, brk: 5 },
  { id: "50/10", focus: 50, brk: 10 },
];
export const SLEEP_MINUTES = [15, 30, 45, 60, 90];

export function startFocus(preset, now = Date.now()) {
  return {
    preset,
    phase: "focus",
    endsAt: now + preset.focus * 60000,
    rounds: 0,
  };
}

export function advanceFocus(focus, now = Date.now()) {
  if (!focus || now < focus.endsAt) return { focus, cue: null };
  if (focus.phase === "focus") {
    return {
      focus: { ...focus, phase: "break", endsAt: now + focus.preset.brk * 60000 },
      cue: "chime",
    };
  }
  return {
    focus: { ...focus, phase: "focus", endsAt: now + focus.preset.focus * 60000, rounds: focus.rounds + 1 },
    cue: "bell",
  };
}

export function skipPhase(focus, now = Date.now()) {
  if (!focus) return null;
  return advanceFocus({ ...focus, endsAt: now - 1 }, now).focus;
}

export function startSleep(minutes, now = Date.now()) {
  return { minutes, endsAt: now + minutes * 60000 };
}

export function sleepStep(sleep, now = Date.now()) {
  if (!sleep) return { sleep: null, fire: false };
  if (now >= sleep.endsAt) return { sleep: null, fire: true };
  return { sleep, fire: false };
}

export function countdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
