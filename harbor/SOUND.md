# Harbor sound bed

Original synthesized samples. Not field recordings. Not third-party libraries.

| file | role | license |
|---|---|---|
| `public/harbor/audio/water-lap.mp3` | Quiet looping distant water against pilings (~27 KB, 48 kbps mono) | CC0 1.0 (original DSP) |
| `public/harbor/audio/foghorn.mp3` | Sparse two-tone diaphone one-shot (~28 KB, 64 kbps mono) | CC0 1.0 (original DSP) |

Regenerate:

```sh
python3 scripts/generate-harbor-audio.py
```

Runtime: Web Audio in `src/game/soundBed.ts`. Phaser stays `audio.noAudio` so the engine does not create an AudioContext at boot. Silence until a pointer or key gesture. Foghorn only in fog, night, and overcast. Mute is HUD + `M`, persisted as `harbor-mute-v1`.
