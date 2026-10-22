import { silentWavUrl } from "./dsp.js";

const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
let ac = null;
let keeper = null;

export const isAppleWebKit = () => typeof navigator !== "undefined" && /^Apple/.test(navigator.vendor || "");
export const running = (a) => a && a.state === "running";

export function unlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch {
    /* Safari < 16.4 */
  }
  if (!ac) {
    if (!AC) throw new Error("Web Audio is not supported");
    try {
      ac = new AC({ latencyHint: "playback" });
    } catch {
      ac = new AC();
    }
  }
  if (ac.state !== "running") ac.resume().catch(() => {});
  try {
    const s = ac.createBufferSource();
    s.buffer = ac.createBuffer(1, 1, ac.sampleRate);
    s.connect(ac.destination);
    s.onended = () => s.disconnect();
    s.start(0);
  } catch {
    /* context closed */
  }
  if (isAppleWebKit()) keepAlive(true);
  return ac;
}

export function close(a) {
  if (a && a === ac) {
    ac = null;
    keepAlive(false);
  }
  return a && a.state !== "closed" ? a.close().catch(() => {}) : Promise.resolve();
}

export function whenRunning(a, ms = 1500) {
  if (running(a)) return Promise.resolve(true);
  return new Promise((res) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      a.removeEventListener("statechange", onChange);
      clearTimeout(tm);
      res(running(a));
    };
    const onChange = () => {
      if (running(a)) finish();
    };
    a.addEventListener("statechange", onChange);
    const tm = setTimeout(finish, ms);
    a.resume().then(finish, finish);
  });
}

export function keepAlive(on) {
  if (!isAppleWebKit() || typeof document === "undefined") return;
  if (!keeper) {
    if (!on) return;
    keeper = document.createElement("audio");
    keeper.setAttribute("playsinline", "");
    keeper.setAttribute("x-webkit-airplay", "deny");
    keeper.loop = true;
    keeper.preload = "auto";
    keeper.disableRemotePlayback = true;
    keeper.src = silentWavUrl();
  }
  if (on) {
    const p = keeper.play();
    if (p && p.catch) p.catch(() => {});
  } else keeper.pause();
}

export function watch(a, { onInterrupted = () => {}, onRunning = () => {} } = {}) {
  const fn = () => {
    if (a.state === "running") onRunning();
    else if (a.state === "suspended" || a.state === "interrupted") onInterrupted(a.state);
  };
  a.addEventListener("statechange", fn);
  return () => a.removeEventListener("statechange", fn);
}

export const latencyOf = (a) => (a && (a.outputLatency || a.baseLatency)) || 0;
export const audioTimeIn = (a, s) => a.currentTime + s - latencyOf(a);
