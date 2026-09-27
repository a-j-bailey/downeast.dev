import { unlock as unlockContext, close as closeContext, whenRunning, keepAlive, watch, running } from "./context.js";
import { createClock } from "./clock.js";
import { hold } from "./dsp.js";
import { createMixer } from "./mixer.js";
import { createEngine } from "./engine.js";
import { normVibe } from "./arrange.js";
import { createAmbience, soundsOf } from "./ambience.js";
import { EVENTS } from "./sounds.js";

const HORIZON = { visible: 0.3, hidden: 4 };
const CUE_GAIN = { chime: 2, bell: 1.5 };
const CUE_TRIM = 2.2;
const clamp01 = (v) => Math.min(1, Math.max(0, +v || 0));
const coarse = () => {
  try {
    return !!(globalThis.matchMedia && matchMedia("(pointer: coarse)").matches);
  } catch {
    return false;
  }
};
const randomSeed = () => {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }
};

export function createPlayer({ lite = coarse(), seed = randomSeed() } = {}) {
  const listeners = { state: new Set(), track: new Set(), queue: new Set() };
  let ac = null;
  let mixer = null;
  let engine = null;
  let amb = null;
  let clock = null;
  let state = "locked";
  let track = null;
  let scene = null;
  let time = () => performance.now() / 1000;
  let vibe = normVibe(null);
  let musicVol = 0.8;
  let ambVol = 0.6;
  let want = false;
  let starting = null;
  let suspendTimer = 0;
  let suspended = false;
  let fadeTimer = 0;
  let cueBus = null;
  let unwatch = null;
  let disposed = false;
  const trims = {};
  let hidden = typeof document !== "undefined" && document.hidden;
  let horizon = hidden ? HORIZON.hidden : HORIZON.visible;

  const emit = (ev, v) => {
    for (const cb of [...listeners[ev]]) {
      try {
        cb(v);
      } catch (e) {
        console.error(e);
      }
    }
  };
  const setState = (s) => {
    if (s !== state && !disposed) {
      state = s;
      emit("state", s);
    }
  };
  const trackInfo = (p) => ({
    title: p.title,
    artist: `Downeast · ${p.city}`,
    city: p.city,
    source: "generative",
    seed: p.seed,
    bpm: Math.round(p.bpm),
    key: p.keyName,
    duration: p.duration,
    energy: p.vibe.energy,
    band: p.vibe.band,
  });
  const setTrack = (info) => {
    track = info;
    emit("track", info);
    emit("queue", player.queue);
  };

  function tick() {
    if (!ac || !running(ac)) return;
    const until = ac.currentTime + horizon;
    try {
      if (engine) engine.advance(until);
      if (amb) amb.advance(until);
    } catch (e) {
      console.error("[audio]", e);
    }
  }

  function startEngine() {
    if (engine) return;
    mixer.vinyl.gain.setTargetAtTime(1, ac.currentTime, 0.3);
    engine = createEngine(ac, mixer, {
      scene,
      vibe,
      lite,
      onTrack: (p) => setTrack(trackInfo(p)),
    });
    engine.start(seed, ac.currentTime + 0.15);
  }

  function onVisibility() {
    hidden = document.hidden;
    horizon = hidden ? HORIZON.hidden : HORIZON.visible;
    if (clock) clock.setHidden(hidden);
    if (hidden || !ac) return;
    if (want && !running(ac)) {
      ac.resume().catch(() => {});
      setTimeout(() => {
        if (want && !running(ac)) setState("interrupted");
      }, 300);
    }
    tick();
  }

  function onPageShow(e) {
    if (e.persisted && state !== "locked") player.pause();
  }

  async function boot() {
    const ok = await whenRunning(ac, 2000);
    if (disposed) return;
    if (!mixer) mixer = createMixer(ac, { lite, musicVolume: musicVol, ambienceVolume: ambVol });
    amb = createAmbience(ac, mixer, { key: () => (engine ? engine.key() : null), seed, trims });
    if (scene) amb.setScene(scene, time, 3);
    if (!engine) startEngine();
    clock = createClock(tick);
    clock.setHidden(hidden);
    clock.start();
    tick();
    starting = null;
    if (!want) {
      suspendNow();
      setState("paused");
      return;
    }
    setState(ok && running(ac) ? "playing" : "interrupted");
  }

  function suspendNow() {
    clearTimeout(suspendTimer);
    keepAlive(false);
    suspended = true;
    ac.suspend().catch(() => {});
  }

  const player = {
    unlock() {
      if (disposed) return Promise.resolve();
      if (starting) {
        want = true;
        if (!running(ac)) unlockContext();
        return starting;
      }
      if (ac) {
        if (state !== "playing") player.play();
        return Promise.resolve();
      }
      want = true;
      setState("starting");
      try {
        ac = unlockContext();
      } catch (e) {
        setState("locked");
        return Promise.reject(e);
      }
      unwatch = watch(ac, {
        onInterrupted: () => {
          if (want && !starting && !suspended) setState("interrupted");
        },
        onRunning: () => {
          if (want && !starting && state !== "playing") {
            setState("playing");
            if (amb) amb.resync();
          }
        },
      });
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
      if (typeof addEventListener === "function") addEventListener("pageshow", onPageShow);
      starting = boot();
      return starting;
    },
    play() {
      want = true;
      clearTimeout(fadeTimer);
      if (!ac) return player.unlock();
      keepAlive(true);
      suspended = false;
      ac.resume().catch(() => {});
      hold(mixer.master.gain, ac.currentTime);
      mixer.master.gain.setTargetAtTime(1, ac.currentTime, 0.08);
      if (amb) amb.resync();
      setState(running(ac) ? "playing" : "interrupted");
    },
    pause() {
      want = false;
      if (!ac || !mixer) return;
      clearTimeout(fadeTimer);
      hold(mixer.master.gain, ac.currentTime);
      mixer.master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(suspendNow, 260);
      setState("paused");
    },
    toggle() {
      if (state === "locked") return player.unlock();
      if (state === "playing" || state === "starting") player.pause();
      else player.play();
    },
    next(id) {
      if (engine) engine.next(id);
    },
    setMusicVolume(v) {
      musicVol = clamp01(v);
      if (mixer) mixer.setMusicVolume(musicVol);
    },
    setAmbienceVolume(v) {
      ambVol = clamp01(v);
      if (mixer) mixer.setAmbienceVolume(ambVol);
    },
    setSoundTrim(id, v) {
      trims[id] = v;
      if (amb) amb.setTrim(id, v);
    },
    setScene(s, timeFn) {
      scene = s;
      if (timeFn) time = timeFn;
      if (engine) engine.setScene(s);
      if (amb) amb.setScene(s, time, 3);
    },
    setVibe(v) {
      vibe = normVibe(v);
      if (engine) engine.setVibe(vibe);
      emit("queue", player.queue);
    },
    on(ev, cb) {
      listeners[ev].add(cb);
      return () => listeners[ev].delete(cb);
    },
    cue(type) {
      if (state !== "playing" || !EVENTS[type] || !ac) return false;
      if (!cueBus) {
        cueBus = ac.createGain();
        cueBus.connect(mixer.master);
      }
      const level = CUE_TRIM * Math.max(musicVol, ambVol) ** 2;
      cueBus.gain.setTargetAtTime(level, ac.currentTime, 0.02);
      EVENTS[type](ac, cueBus, ac.currentTime + 0.02, { gain: CUE_GAIN[type] || 1 }, { registry: { add: () => {} }, key: () => engine && engine.key(), r: () => Math.random() });
      return true;
    },
    fadeOut(sec) {
      if (!mixer || state !== "playing") return;
      clearTimeout(fadeTimer);
      hold(mixer.master.gain, ac.currentTime);
      mixer.master.gain.setTargetAtTime(0.01, ac.currentTime, sec / 4);
      fadeTimer = setTimeout(() => player.pause(), sec * 1000);
    },
    get state() {
      return state;
    },
    get track() {
      return track;
    },
    get queue() {
      return engine ? engine.queue : [];
    },
    get sounds() {
      return soundsOf(scene);
    },
    get vibe() {
      return vibe;
    },
    async dispose() {
      disposed = true;
      if (clock) clock.stop();
      if (engine) engine.dispose();
      if (amb) amb.dispose();
      if (mixer) mixer.dispose();
      if (unwatch) unwatch();
      await closeContext(ac);
    },
  };
  return player;
}
