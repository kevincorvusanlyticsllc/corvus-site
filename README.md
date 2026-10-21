# corvusanalyticsllc.com

The Corvus Analytics LLC website: plain HTML and one stylesheet, no framework, no build step.
GitHub Pages publishes the `main` branch as it is.

| File | What it is |
| --- | --- |
| `index.html` | Home: the practices, the interactive Corvus window, the FAQ, contact |
| `corvus/index.html` | The Corvus page (`/corvus/`): what it does and how it's built, in plain text |
| `about.html`, `contact.html` | Stubs, hidden from the nav and marked `noindex` |
| `404.html` | Not-found page (GitHub Pages serves it for any missing path) |
| `assets/site.css` | The one stylesheet: colour tokens (dark), mobile first |
| `assets/corvus-demo.js` | The home page's Corvus desk window: the orb, the looping demo (sample commands only), hover and click |
| `assets/corvus-mark.svg` | The logo: faceted 3D raven with a third eye (hero size, with ™) |
| `assets/corvus-icon.svg` | The same raven, brighter and cropped, for the header and small sizes |
| `assets/favicon.svg`, `favicon.ico`, `assets/apple-touch-icon.png` | Icons |
| `assets/logo.png` | 512 px square logo for search engines (the structured data points at it) |
| `assets/og.png` | Link-preview image (1200 x 630) |
| `robots.txt` | Crawler policy: search engines and AI search bots in, AI-training-only crawlers out |
| `llms.txt` | Plain-text summary of the company and Corvus for AI tools |
| `sitemap.xml` | The indexable pages |
| `<key>.txt` | The IndexNow key file (see `tools/indexnow.sh`) |
| `tools/chrome.mjs` | Writes the shared header and footer into every page |
| `tools/indexnow.sh` | Tells Bing and the other IndexNow engines the site changed |
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

The header and footer are plain HTML in every page, so crawlers that don't run JavaScript (most AI
crawlers) still see the nav, the trademark notice and the disclaimers. Their one source is
`tools/chrome.mjs`: change the nav, brand or footer there, then run

```bash
node tools/chrome.mjs
```

and commit the pages it rewrites. It also writes the footer's year, so run it once each January.

To put About or Contact in the nav:

1. `tools/chrome.mjs`: set `show: true` on its entry, then run it.
2. In that page, delete the `<meta name="robots" content="noindex">` line.
3. Add its URL to `sitemap.xml` and `llms.txt`.

A new page: copy `about.html`, change the title, description, canonical URL and `<main>`, add it to
`PAGES` (and `NAV` if it belongs there) in `tools/chrome.mjs`, and run it.

## Search and AI tools

- The home page carries Organization, WebSite and FAQPage structured data, and the Corvus page a
  SoftwareApplication entry. Keep the FAQ's structured data word for word with the visible questions.
- Google Search Console and Bing Webmaster Tools are set up for the domain; submit `sitemap.xml`
  there after adding a page.
- After a push that changes content, once Pages has rebuilt: `bash tools/indexnow.sh`.

## Publish

Push to `main`. GitHub Pages rebuilds in a minute or so.

GitHub Pages lets browsers cache CSS and JS for 10 minutes, so a new page can meet an old
stylesheet. The pages load `site.css` and `corvus-demo.js` with a `?v=` stamp: when you change
either, bump the stamp in every HTML file, e.g.

```bash
sed -i -E 's#(/assets/(site\.css|corvus-demo\.js))\?v=[^"]*"#\1?v=NEWSTAMP"#g' *.html corvus/index.html
```

Images that matter for layout also carry `width` and `height`, so they stay their size either way.
