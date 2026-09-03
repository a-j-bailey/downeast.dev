# downeast.dev

Personal site for [Adam Bailey](https://github.com/a-j-bailey). The homepage is a walkable side-view Maine harbor. The original boat drawing hangs as a painting in the coffee shop.

This is a static Vite + React SPA. It deploys as a Cloudflare Worker named `downeast-dev` that serves `dist/` as static assets with SPA fallback. There is no Worker script.

## Walk the harbor

On [downeast.dev](https://downeast.dev):

- **Arrows** or **WASD** — walk left/right (onto the pier). In the boat: steer, **up/down** to throttle out to open water.
- **E** or **Enter** — use the nearest door, sign, or boat. **Esc** leaves the coffee shop.
- **Tap** the ground to walk; tap a building or sign to use it.

GitHub and X are the trail signs in the street. The coffee shop is enterable. The shacks are closed until they have interiors. Weather follows Bristol, Rhode Island.

How to grow the world: `.cursor/skills/harbor-world/SKILL.md` and `harbor/ART.md`.

## Develop

```sh
npm i && npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

```sh
npm run build
```

writes a static site to `dist/`. `npm run preview` serves that output locally.

## Add a project

Edit `src/content/projects.ts`. Linked work:

```ts
{
  kind: "link",
  title: "Name of the work",
  year: 2026,
  summary: "One or two sentences.",
  url: "https://…",
}
```

Work with no public URL uses `kind: "listed"` and drops `url`. The page renders the array in order. An empty array hides Projects from the nav.

## Add a thought

Edit `src/content/thoughts.ts`. Each entry is:

```ts
{
  title: "A short title",
  date: "2026-08-25",    // YYYY-MM-DD
  body: "A paragraph. Keep it short.",
}
```

The page sorts by date, newest first. An empty array hides Thoughts from the nav. This is not a blog engine.

## Hosting / Domains

The site deploys as a Cloudflare Worker named `downeast-dev`. Wrangler uploads `dist/` as static assets and serves unmatched routes with `index.html` (`not_found_handling: "single-page-application"`). There is no Worker script.

Canonical domain is **downeast.dev**. `www.downeast.dev`, **ajbailey.dev**, and `www.ajbailey.dev` are custom domains on the same Worker. Both zones must already live on the same Cloudflare account (nameservers on Cloudflare).

```sh
npm run deploy
```

builds `dist/` and deploys. GitHub Actions (`.github/workflows/deploy.yml`) deploys on push to `main` once `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as repository secrets.

`public/CNAME` is still `downeast.dev`. The build still copies `index.html` to `dist/404.html` so client-side routes (`/projects`, `/thoughts`, unknown URLs) load the SPA on hosts that look for a 404 page.

## Color

Type and chrome still use [Flexoki](https://stephango.com/flexoki) by Steph Ango (MIT) in `src/index.css`. Harbor sprites use the coastal palette in `harbor/ART.md` — Flexoki is optional there.

## Assets

The source drawing is `public/boat.jpeg` (ink on paper). `scripts/punch-boat.py` knocks the paper out and writes `public/boat.png` in Flexoki black. Favicons, the apple touch icon, the Open Graph image, and the 404 wake are cropped or composited from that PNG. Harbor sprites live in `public/harbor/` and are regenerated with `python3 scripts/harbor-sprites.py`.

```sh
python3 scripts/punch-boat.py
python3 scripts/generate-assets.py
```
