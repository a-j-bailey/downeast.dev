# downeast.dev

Personal site for [Adam Bailey](https://github.com/a-j-bailey). The homepage is a calm media player: a living 480×270 pixel harbor ("East Passage") with endless generative lofi and village ambience.

This is a static Vite app (vanilla ES modules, Canvas2D + Web Audio). It deploys as a Cloudflare Worker named `downeast-dev` that serves `dist/` as static assets with SPA fallback. There is no Worker script.

## Develop

```sh
npm i && npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

Browsers block audio until a gesture. Click **Play**, tap the scene, or press Space. The play button pulses until then.

```sh
npm run build
```

writes a static site to `dist/`. `npm run preview` serves that output locally.

## Scene loop

The harbor is painted each frame into a 480×270 buffer and nearest-neighbor upscaled to the viewport (integer scale preferred). Animation is a function of loop time `t % 240` seconds, so the night seals: boats, lights, gulls, and the dock walker all repeat cleanly.

## Audio

Generative Web Audio only — no samples, no Tone.js. Unlock starts an AudioContext. Music (EP, bass, swung kit, vinyl/tape) and harbor beds (water, wind, waves, rain, buoy, gulls, ferry) have separate volumes. **A** opens the per-sound mixer. **V** sets vibe (energy from the next track, band from the next bar). **M** mutes.

## Keyboard

| key | action |
| --- | --- |
| Space | Play / pause |
| N | Next track |
| M | Mute |
| Q / V / T / A | Queue, vibe, timers, mixer |
| S | Save a 1920×1080 PNG of the current frame |
| F | Fullscreen |
| H | Hide the interface |
| ? | About |

The bottom dock fades after a few idle seconds. Move the pointer or press a key to bring it back.

## Add a project

Edit `src/content/projects.js`. Linked work:

```js
{
  kind: "link",
  title: "Name of the work",
  year: 2026,
  summary: "One or two sentences.",
  url: "https://…",
}
```

Work with no public URL uses `kind: "listed"` and drops `url`. An empty array hides Projects from the nav. `/projects` opens a light overlay so the harbor and audio keep running.

## Add a thought

Edit `src/content/thoughts.js`. Each entry is:

```js
{
  title: "A short title",
  date: "2026-08-25",    // YYYY-MM-DD
  body: "A paragraph. Keep it short.",
}
```

The list sorts by date, newest first. An empty array hides Thoughts.

## Hosting / Domains

The site deploys as a Cloudflare Worker named `downeast-dev`. Wrangler uploads `dist/` as static assets and serves unmatched routes with `index.html` (`not_found_handling: "single-page-application"`).

Canonical domain is **downeast.dev**. `www.downeast.dev`, **ajbailey.dev**, and `www.ajbailey.dev` are custom domains on the same Worker.

```sh
npm run deploy
```

GitHub Actions (`.github/workflows/deploy.yml`) deploys on push to `main` once `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as repository secrets.

`public/CNAME` is still `downeast.dev`. The build copies `index.html` to `dist/404.html` so client-side routes load on hosts that look for a 404 page.

## Color

The UI uses [Flexoki](https://stephango.com/flexoki) by Steph Ango (MIT), dark tokens, with a warm lamp accent that fits the harbor night. The scene palette is painted in Canvas, not as CSS.

## Favicons

`public/boat.jpeg` is the source drawing. `scripts/punch-boat.py` knocks the paper out; `scripts/generate-assets.py` writes favicons and the Open Graph image.

```sh
python3 scripts/punch-boat.py
python3 scripts/generate-assets.py
```
