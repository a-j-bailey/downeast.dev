# Harbor sound bed

Original synthesized samples. Not field recordings. Not third-party libraries.

| file | role | license |
|---|---|---|
| `public/harbor/audio/water-lap.mp3` | Looping distant water against pilings (~27 KB, 48 kbps mono) | CC0 1.0 (original DSP) |
| `public/harbor/audio/foghorn.mp3` | Sparse two-tone diaphone one-shot (~28 KB, 64 kbps mono) | CC0 1.0 (original DSP) |

Regenerate:

```sh
python3 scripts/generate-harbor-audio.py
```

Water sample mean is about −21 dB. Playback linear gains in `soundProfile`:

| mood | waterGain | foghorn |
|---|---|---|
| clearDay | 0.40 | no |
| overcast | 0.34 | yes |
| rain | 0.48 | no |
| fog | 0.28 | yes |
| night | 0.26 | yes |

Horn playback gain is 0.30. First foghorn (fog / night / overcast) waits 8–15 s after unlock; later blasts stay sparse (tens of seconds to a couple of minutes).

Runtime: Web Audio in `src/game/soundBed.ts`. Phaser stays `audio.noAudio` so the engine does not create an AudioContext at boot. Silence until a pointer or key gesture. Mute is the cream speaker chip (top-left HUD) plus `M` on desktop, persisted as `harbor-mute-v1`. Missing key means unmuted.
