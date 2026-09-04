import { EventBus } from "./EventBus";
import { type WeatherMood } from "./weather";

const MUTE_KEY = "harbor-mute-v1";
const WATER_URL = "/harbor/audio/water-lap.mp3";
const HORN_URL = "/harbor/audio/foghorn.mp3";
const HORN_GAIN = 0.3;
const WATER_FADE_S = 0.35;
const FIRST_HORN_MIN_MS = 8_000;
const FIRST_HORN_MAX_MS = 15_000;

type SoundProfile = {
  waterGain: number;
  horn: boolean;
  hornMinMs: number;
  hornMaxMs: number;
};

export function readHarborMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHarborMute(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

/** Linear Web Audio gains on a −21 dB mean water sample / −10 dB horn. */
export function soundProfile(mood: WeatherMood): SoundProfile {
  switch (mood) {
    case "clearDay":
      return { waterGain: 0.4, horn: false, hornMinMs: 0, hornMaxMs: 0 };
    case "overcast":
      return { waterGain: 0.34, horn: true, hornMinMs: 55_000, hornMaxMs: 130_000 };
    case "rain":
      return { waterGain: 0.48, horn: false, hornMinMs: 0, hornMaxMs: 0 };
    case "fog":
      return { waterGain: 0.28, horn: true, hornMinMs: 35_000, hornMaxMs: 85_000 };
    case "night":
      return { waterGain: 0.26, horn: true, hornMinMs: 50_000, hornMaxMs: 120_000 };
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}

function isMood(value: unknown): value is WeatherMood {
  return (
    value === "clearDay" ||
    value === "overcast" ||
    value === "rain" ||
    value === "fog" ||
    value === "night"
  );
}

function audioContextCtor(): (typeof AudioContext) | null {
  if (typeof AudioContext !== "undefined") {
    return AudioContext;
  }
  const webkit = (window as unknown as { webkitAudioContext?: typeof AudioContext })
    .webkitAudioContext;
  return webkit ?? null;
}

const windowGestureOpts: AddEventListenerOptions = { capture: true, once: true };

export class SoundBed {
  private root: HTMLElement | null = null;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private hornGain: GainNode | null = null;
  private waterSource: AudioBufferSourceNode | null = null;
  private waterBuffer: AudioBuffer | null = null;
  private hornBuffer: AudioBuffer | null = null;
  private waterBytes: ArrayBuffer | null = null;
  private hornBytes: ArrayBuffer | null = null;
  private unlocked = false;
  private muted = readHarborMute();
  private mood: WeatherMood = "clearDay";
  private hornTimer: number | null = null;
  private hornPlaying = false;
  private hornHeard = false;
  private loadStarted = false;
  private decodeWait: Promise<void> | null = null;

  attach(root: HTMLElement): void {
    this.root = root;
    this.muted = readHarborMute();
    if (this.muted && import.meta.env.DEV) {
      console.warn("[harbor] ambient bed muted (harbor-mute-v1); tap the speaker to unmute");
    }
    root.addEventListener("pointerdown", this.onGesture, true);
    root.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("pointerdown", this.onGesture, windowGestureOpts);
    window.addEventListener("keydown", this.onGesture, windowGestureOpts);
    document.addEventListener("visibilitychange", this.onVisibility);
    EventBus.on("harbor-weather", this.onWeather);
    EventBus.on("harbor-mute-toggle", this.onMuteToggle);
    EventBus.on("harbor-mute-query", this.onMuteQuery);
    this.prefetch();
    EventBus.emit("harbor-mute-state", this.muted);
  }

  destroy(): void {
    this.root?.removeEventListener("pointerdown", this.onGesture, true);
    this.root?.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("pointerdown", this.onGesture, true);
    window.removeEventListener("keydown", this.onGesture, true);
    document.removeEventListener("visibilitychange", this.onVisibility);
    EventBus.off("harbor-weather", this.onWeather);
    EventBus.off("harbor-mute-toggle", this.onMuteToggle);
    EventBus.off("harbor-mute-query", this.onMuteQuery);
    this.clearHornTimer();
    this.stopWater();
    if (this.ctx) {
      void this.ctx.close();
    }
    this.ctx = null;
    this.master = null;
    this.waterGain = null;
    this.hornGain = null;
    this.waterBuffer = null;
    this.hornBuffer = null;
    this.root = null;
    this.unlocked = false;
  }

  private onGesture = (): void => {
    this.unlock();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    this.unlock();
    if (event.key !== "m" && event.key !== "M") {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.toggleMute();
  };

  private onVisibility = (): void => {
    this.sync();
  };

  private onWeather = (...args: unknown[]): void => {
    const mood = args[0];
    if (isMood(mood)) {
      this.mood = mood;
      this.applyMoodGains();
      this.syncHorn();
    }
  };

  private onMuteToggle = (): void => {
    this.toggleMute();
  };

  private onMuteQuery = (): void => {
    EventBus.emit("harbor-mute-state", this.muted);
  };

  private toggleMute(): void {
    this.muted = !this.muted;
    writeHarborMute(this.muted);
    EventBus.emit("harbor-mute-state", this.muted);
    if (!this.muted) {
      this.unlock();
    }
    this.sync();
  }

  private prefetch(): void {
    if (this.loadStarted) {
      return;
    }
    this.loadStarted = true;
    void Promise.all([
      fetch(WATER_URL).then((res) => (res.ok ? res.arrayBuffer() : null)),
      fetch(HORN_URL).then((res) => (res.ok ? res.arrayBuffer() : null)),
    ])
      .then(async ([water, horn]) => {
        this.waterBytes = water;
        this.hornBytes = horn;
        if (!water) {
          console.warn("[harbor] water-lap sample missing");
        }
        if (this.unlocked) {
          if (this.decodeWait) {
            await this.decodeWait;
          }
          await this.decodeAndStart();
        }
      })
      .catch(() => {
        console.warn("[harbor] ambient audio failed to load");
      });
  }

  private unlock(): void {
    this.unlocked = true;
    const Ctor = audioContextCtor();
    if (!Ctor) {
      return;
    }
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.waterGain = this.ctx.createGain();
      this.hornGain = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.waterGain.gain.value = 0;
      this.hornGain.gain.value = HORN_GAIN;
      this.waterGain.connect(this.master);
      this.hornGain.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    // resume() must stay in the gesture call stack (no await before it).
    void this.ctx.resume();
    void this.decodeAndStart();
  }

  private decodeAndStart(): Promise<void> {
    if (this.waterSource && this.waterBuffer) {
      this.sync();
      return Promise.resolve();
    }
    const run = async (): Promise<void> => {
      await this.decodeBuffers();
      this.ensureWater();
      this.applyMoodGains();
      this.sync();
    };
    if (this.decodeWait) {
      return this.decodeWait;
    }
    this.decodeWait = run().finally(() => {
      this.decodeWait = null;
    });
    return this.decodeWait;
  }

  private async decodeBuffers(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    if (!this.waterBuffer && this.waterBytes) {
      this.waterBuffer = await ctx.decodeAudioData(this.waterBytes.slice(0));
    }
    if (!this.hornBuffer && this.hornBytes) {
      this.hornBuffer = await ctx.decodeAudioData(this.hornBytes.slice(0));
    }
  }

  private hear(): boolean {
    return this.unlocked && !this.muted && !document.hidden && this.ctx !== null;
  }

  private sync(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) {
      return;
    }
    if (!this.unlocked || document.hidden) {
      void ctx.suspend();
      this.clearHornTimer();
      return;
    }
    void ctx.resume();
    this.master.gain.setValueAtTime(this.muted ? 0 : 1, ctx.currentTime);
    this.ensureWater();
    this.applyMoodGains();
    if (this.muted) {
      this.clearHornTimer();
      return;
    }
    this.syncHorn();
  }

  private ensureWater(): void {
    if (!this.ctx || !this.waterGain || !this.waterBuffer || this.waterSource) {
      return;
    }
    const source = this.ctx.createBufferSource();
    this.waterSource = source;
    source.buffer = this.waterBuffer;
    source.loop = true;
    source.connect(this.waterGain);
    source.start();
    source.onended = () => {
      if (this.waterSource === source) {
        this.waterSource = null;
      }
    };
  }

  private stopWater(): void {
    if (!this.waterSource) {
      return;
    }
    try {
      this.waterSource.stop();
    } catch {
      // already stopped
    }
    this.waterSource.disconnect();
    this.waterSource = null;
  }

  private applyMoodGains(): void {
    if (!this.ctx || !this.waterGain) {
      return;
    }
    const profile = soundProfile(this.mood);
    const now = this.ctx.currentTime;
    const from = this.waterGain.gain.value;
    this.waterGain.gain.cancelScheduledValues(now);
    this.waterGain.gain.setValueAtTime(from, now);
    this.waterGain.gain.linearRampToValueAtTime(profile.waterGain, now + WATER_FADE_S);
  }

  private syncHorn(): void {
    const profile = soundProfile(this.mood);
    if (!profile.horn || !this.hear()) {
      this.clearHornTimer();
      return;
    }
    if (this.hornTimer !== null || this.hornPlaying) {
      return;
    }
    this.armHorn();
  }

  private armHorn(): void {
    this.clearHornTimer();
    const profile = soundProfile(this.mood);
    if (!profile.horn || !this.hear()) {
      return;
    }
    const first = !this.hornHeard;
    const min = first ? FIRST_HORN_MIN_MS : profile.hornMinMs;
    const max = first ? FIRST_HORN_MAX_MS : profile.hornMaxMs;
    const span = Math.max(0, max - min);
    const delay = min + Math.random() * span;
    this.hornTimer = window.setTimeout(() => {
      this.hornTimer = null;
      this.playHorn();
    }, delay);
  }

  private playHorn(): void {
    if (!this.hear() || !this.ctx || !this.hornGain || !this.hornBuffer) {
      this.syncHorn();
      return;
    }
    if (!soundProfile(this.mood).horn) {
      return;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.hornBuffer;
    source.connect(this.hornGain);
    this.hornPlaying = true;
    this.hornHeard = true;
    source.onended = () => {
      this.hornPlaying = false;
      this.armHorn();
    };
    source.start();
  }

  private clearHornTimer(): void {
    if (this.hornTimer === null) {
      return;
    }
    window.clearTimeout(this.hornTimer);
    this.hornTimer = null;
  }
}
