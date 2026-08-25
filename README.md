# downeast.dev

Personal site for [Adam Bailey](https://github.com/a-j-bailey). Ink on paper. The drawing is the thing people remember.

This is a static Vite + React SPA. No server. The built files in `dist/` can be hosted on GitHub Pages, Cloudflare Pages, or any static host.

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

Edit `src/content/projects.ts`. Each entry is:

```ts
{
  title: "Name of the work",
  year: "2026",          // optional
  summary: "One or two sentences.",
  url: "https://…",      // optional
}
```

The file ships with one object marked `example: true` so the list isn’t empty on day one. Delete that object when you add real work. The page renders the array in order; an empty array shows “Nothing here yet.”

## Add a thought

Edit `src/content/thoughts.ts`. Each entry is:

```ts
{
  title: "A short title",
  date: "2026-08-25",    // YYYY-MM-DD
  body: "A paragraph. Keep it short.",
}
```

The page sorts by date, newest first. An empty array shows “Nothing here yet.” This is not a blog engine.

## Domains

The identity is **downeast.dev**. Canonical URLs, the document title, and Open Graph tags all point there.

**ajbailey.dev** should serve the same site. Point both domains at whichever static host you use:

1. Build and publish `dist/` (GitHub Pages, Cloudflare Pages, Netlify, etc.).
2. Add `downeast.dev` as the primary custom domain.
3. Add `ajbailey.dev` (and `www` if you want it) as an alias or additional custom domain on the same project, so both hostnames serve these files.
4. At the DNS registrar, CNAME (or ALIAS/ANAME at the apex) both names to the host. GitHub Pages wants a CNAME or A records as in [their docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site). Cloudflare Pages uses a CNAME to `your-project.pages.dev`.

`public/CNAME` is set to `downeast.dev` for GitHub Pages. The build also copies `index.html` to `dist/404.html` so client-side routes (`/projects`, `/thoughts`, unknown URLs) load the SPA. Cloudflare Pages gets `public/_redirects` (`/* → /index.html`).

## Color

The palette is [Flexoki](https://stephango.com/flexoki) by Steph Ango (MIT). Tokens live in `src/index.css` as `--bg`, `--bg-2`, `--ui`, `--tx`, `--cy`, and the rest. Do not add greys from outside that set. The paper background is Flexoki `--bg` (`#FFFCF0`) so the ink drawing sits on the intended sheet.

## Assets

The boat drawing lives in `public/boat.svg` and is rasterized to `public/boat.png` / `public/boat.jpeg`. Favicons, the apple touch icon, the Open Graph image, and the 404 wake are derived from the same line work. To regenerate them (requires Python, Pillow, and CairoSVG):

```sh
python3 scripts/generate-assets.py
```
