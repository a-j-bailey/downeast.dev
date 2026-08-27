# downeast.dev

Personal site for [Adam Bailey](https://github.com/a-j-bailey). Ink on paper. The drawing is the thing people remember.

This is a static Vite + React SPA. It deploys as a Cloudflare Worker named `downeast-dev` that serves `dist/` as static assets with SPA fallback. There is no Worker script.

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

The palette is [Flexoki](https://stephango.com/flexoki) by Steph Ango (MIT). Tokens live in `src/index.css` as `--bg`, `--bg-2`, `--ui`, `--tx`, `--cy`, and the rest. Do not add greys from outside that set. The paper background is Flexoki `--bg` (`#FFFCF0`) so the ink drawing sits on the intended sheet.

## Assets

The source drawing is `public/boat.jpeg` (ink on paper). `scripts/punch-boat.py` knocks the paper out and writes `public/boat.png` in Flexoki black. Favicons, the apple touch icon, the Open Graph image, and the 404 wake are cropped or composited from that PNG.

```sh
python3 scripts/punch-boat.py
python3 scripts/generate-assets.py
```
