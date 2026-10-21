# corvusanalyticsllc.com

The Corvus Analytics LLC website: plain HTML and one stylesheet, no framework, no build step.
GitHub Pages publishes the `main` branch as it is.

| File | What it is |
| --- | --- |
| `index.html` | Home (holding page) |
| `about.html`, `contact.html` | Stubs, hidden from the nav and marked `noindex` |
| `404.html` | Not-found page (GitHub Pages serves it for any missing path) |
| `assets/site.css` | The one stylesheet: colour tokens (dark), mobile first |
| `assets/site.js` | The shared header and footer, and the nav list |
| `assets/corvus-demo.js` | The home page's Corvus desk window: the orb, the looping demo (sample commands only), hover and click |
| `assets/corvus-mark.svg` | The logo: faceted 3D raven with a third eye (hero size) |
| `assets/corvus-icon.svg` | The same raven, brighter and cropped, for the header and small sizes |
| `assets/favicon.svg`, `favicon.ico`, `assets/apple-touch-icon.png` | Icons |
| `assets/og.png` | Link-preview image (1200 x 630) |
| `tools/raven3d.mjs` | Generates the three raven SVGs (`node tools/raven3d.mjs`); not loaded by the site |
| `tools/console-art.mjs` | Generates the chart in the Corvus desk window; not loaded by the site |
| `drafts/` | Local only (ignored by git): copy not yet published |
| `CNAME` | The custom domain for GitHub Pages |
| `.nojekyll` | Serve files as they are (no Jekyll) |

## Preview locally

```bash
python -m http.server 8080 --bind 127.0.0.1
```

Then open http://localhost:8080. Paths are root-relative (`/assets/...`), so open the site through a
server, not by double-clicking the file.

## Header, footer and nav

Every page has `<header data-site="header">` and `<footer data-site="footer">`; `assets/site.js`
fills both. Change the nav, brand or footer there once and every page follows.

To put About or Contact in the nav:

1. `assets/site.js`: set `show: true` on its entry.
2. In that page, delete the `<meta name="robots" content="noindex">` line.
3. Add its URL to `sitemap.xml`.

A new page: copy `about.html`, change the title, description, canonical URL and `<main>`, then add it
to `NAV` in `assets/site.js`.

## Publish

Push to `main`. GitHub Pages rebuilds in a minute or so.
