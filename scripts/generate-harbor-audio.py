#!/usr/bin/env python3
"""Synthesize original, tiny harbor bed samples (water loop + foghorn one-shot).

These are original DSP renderings, not recordings. Re-run from the repo root:

    python3 scripts/generate-harbor-audio.py
"""

from __future__ import annotations

import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "harbor" / "audio"
SR = 22050
SEED = 20260904


def write_wav(path: Path, samples: np.ndarray) -> None:
    pcm = np.clip(samples, -1.0, 1.0)
    pcm_i16 = (pcm * 32767.0).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes(pcm_i16.tobytes())


def encode_mp3(wav_path: Path, mp3_path: Path, bitrate: str) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav_path),
            "-ac",
            "1",
            "-ar",
            str(SR),
            "-b:a",
            bitrate,
            str(mp3_path),
        ],
        check=True,
    )


def peak_normalize(x: np.ndarray, peak: float) -> np.ndarray:
    mag = float(np.max(np.abs(x))) or 1.0
    return x * (peak / mag)


def fft_bandpass(x: np.ndarray, lo: float, hi: float, rolloff: float = 0.08) -> np.ndarray:
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / SR)
    gain = np.ones_like(spec, dtype=np.float64)
    gain[freqs < lo] = rolloff
    gain[freqs > hi] = rolloff
    # Gentle shelves instead of a brick wall.
    low_shelf = (freqs >= lo * 0.5) & (freqs < lo)
    high_shelf = (freqs > hi) & (freqs <= hi * 1.8)
    if np.any(low_shelf):
        t = (freqs[low_shelf] - lo * 0.5) / (lo * 0.5)
        gain[low_shelf] = rolloff + (1.0 - rolloff) * t
    if np.any(high_shelf):
        t = (freqs[high_shelf] - hi) / max(hi * 0.8, 1.0)
        gain[high_shelf] = 1.0 - (1.0 - rolloff) * np.clip(t, 0.0, 1.0)
    return np.fft.irfft(spec * gain, n=len(x))


def one_pole_lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    rc = 1.0 / (2.0 * np.pi * cutoff)
    alpha = (1.0 / SR) / (rc + 1.0 / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, sample in enumerate(x):
        acc += alpha * (float(sample) - acc)
        y[i] = acc
    return y


def hann(n: int) -> np.ndarray:
    if n <= 1:
        return np.ones(max(n, 1), dtype=np.float64)
    return 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(n) / (n - 1))


def add_circular(dest: np.ndarray, src: np.ndarray, start: int) -> None:
    n = len(dest)
    m = len(src)
    if m == 0:
        return
    start %= n
    first = min(m, n - start)
    dest[start : start + first] += src[:first]
    rest = m - first
    if rest > 0:
        dest[:rest] += src[first:]


def brown_noise(n: int, rng: np.random.Generator) -> np.ndarray:
    white = rng.standard_normal(n)
    brown = np.cumsum(white)
    brown -= brown.mean()
    return peak_normalize(brown, 1.0)


def make_seamless(x: np.ndarray, fade_s: float) -> np.ndarray:
    fade = max(2, int(fade_s * SR))
    fade = min(fade, len(x) // 4)
    t = np.linspace(0.0, 1.0, fade)
    head = x[:fade] * t + x[-fade:] * (1.0 - t)
    return np.concatenate([head, x[fade:-fade]])


def make_lap(rng: np.random.Generator, duration: float) -> np.ndarray:
    n = max(8, int(duration * SR))
    noise = rng.standard_normal(n)
    body = fft_bandpass(noise, 180.0, 2400.0, rolloff=0.04)
    hollow = fft_bandpass(noise, 70.0, 280.0, rolloff=0.02)
    mix = 0.72 * body + 0.28 * hollow
    env = hann(n) ** 1.15
    # Asymmetric: slightly faster attack than release by skewing the window.
    skew = np.linspace(0.7, 1.15, n)
    return mix * env * skew


def water_loop() -> np.ndarray:
    rng = np.random.default_rng(SEED)
    seconds = 4.8
    n = int(seconds * SR)
    bed = fft_bandpass(brown_noise(n, rng), 70.0, 1100.0, rolloff=0.03)
    t = np.arange(n) / SR
    swell = 0.62 + 0.38 * (0.5 + 0.5 * np.sin(2.0 * np.pi * 0.28 * t + 0.4))
    swell *= 0.85 + 0.15 * np.sin(2.0 * np.pi * 0.11 * t)
    bed *= swell * 0.22

    laps = np.zeros(n, dtype=np.float64)
    # Irregular piling laps; wrap so the loop does not click.
    centers = (0.35, 0.92, 1.55, 2.18, 2.74, 3.36, 3.95, 4.42)
    for i, center in enumerate(centers):
        dur = 0.42 + (i % 3) * 0.12 + float(rng.uniform(-0.05, 0.05))
        burst = make_lap(rng, dur)
        gain = 0.22 + 0.08 * (i % 2) + float(rng.uniform(-0.03, 0.03))
        add_circular(laps, burst * gain, int(center * SR))

    # Very quiet low thumps — hull / piling, not a kick drum.
    for center in (1.1, 2.9, 4.15):
        thump_n = int(0.18 * SR)
        thump_t = np.arange(thump_n) / SR
        thump = np.sin(2.0 * np.pi * 68.0 * thump_t) * np.exp(-thump_t * 18.0)
        thump += 0.35 * np.sin(2.0 * np.pi * 96.0 * thump_t) * np.exp(-thump_t * 22.0)
        add_circular(laps, thump * 0.045, int(center * SR))

    mix = bed + laps
    mix = one_pole_lowpass(mix, 1800.0)
    mix = make_seamless(mix, 0.38)
    return peak_normalize(mix, 0.72)


def ads_env(n: int, attack_s: float, release_s: float) -> np.ndarray:
    attack = max(1, int(attack_s * SR))
    release = max(1, int(release_s * SR))
    attack = min(attack, n // 3)
    release = min(release, n - attack)
    sustain = n - attack - release
    env = np.concatenate(
        [
            np.linspace(0.0, 1.0, attack) ** 1.35,
            np.ones(sustain),
            np.linspace(1.0, 0.0, release) ** 1.6,
        ]
    )
    return env[:n]


def cheap_reverb(x: np.ndarray) -> np.ndarray:
    y = x.copy()
    for delay_ms, gain in ((53, 0.24), (97, 0.16), (139, 0.10), (211, 0.07)):
        delay = int(SR * delay_ms / 1000.0)
        if delay >= len(x):
            continue
        y[delay:] += gain * x[:-delay]
    return y


def foghorn() -> np.ndarray:
    seconds = 3.35
    n = int(seconds * SR)
    t = np.arange(n) / SR
    # Two-tone diaphone (octave), slight sag as air leaves the chamber.
    sag = 1.0 - 0.017 * np.clip((t - 0.7) / 2.4, 0.0, 1.0)
    f1 = 92.0 * sag
    f2 = 184.0 * sag
    phase1 = np.cumsum(2.0 * np.pi * f1 / SR)
    phase2 = np.cumsum(2.0 * np.pi * f2 / SR)
    # Second partial lagged a hair — physical horns don't start perfectly together.
    lag = int(0.035 * SR)
    partial2 = np.sin(phase2)
    partial2 = np.concatenate([np.zeros(lag), partial2[:-lag]])
    tone = 0.62 * np.sin(phase1) + 0.28 * partial2
    tone += 0.08 * np.sin(phase1 * 3.0)
    env = ads_env(n, attack_s=0.42, release_s=0.95)
    # Flatten the sustain a touch so it isn't a cartoon beep.
    env *= 0.88 + 0.12 * np.sin(2.0 * np.pi * 0.7 * t)
    horn = tone * env
    air = one_pole_lowpass(np.random.default_rng(SEED + 1).standard_normal(n), 900.0)
    horn += air * env * 0.03
    horn = cheap_reverb(horn)
    horn = one_pole_lowpass(horn, 720.0)
    # Distance: tuck the start/end into silence.
    pad = int(0.08 * SR)
    out = np.zeros(n + pad, dtype=np.float64)
    out[pad:] = horn
    return peak_normalize(out, 0.78)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    water_wav = OUT_DIR / "water-lap.wav"
    horn_wav = OUT_DIR / "foghorn.wav"
    write_wav(water_wav, water_loop())
    write_wav(horn_wav, foghorn())
    encode_mp3(water_wav, OUT_DIR / "water-lap.mp3", "48k")
    encode_mp3(horn_wav, OUT_DIR / "foghorn.mp3", "64k")
    water_wav.unlink()
    horn_wav.unlink()
    print(f"wrote {OUT_DIR / 'water-lap.mp3'} and {OUT_DIR / 'foghorn.mp3'}")


if __name__ == "__main__":
    main()
