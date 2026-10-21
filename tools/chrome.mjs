// The header and footer every page shares, written into each page as plain HTML, so the nav, the
// trademark notice and the disclaimers are there for crawlers that never run JavaScript (most AI
// crawlers). Edit the nav or footer here, then run
//   node tools/chrome.mjs
// and commit the pages. Each page holds its header and footer between <!-- site:header --> and
// <!-- /site:header -->, <!-- site:footer --> and <!-- /site:footer --> (a new page can start with
// <header data-site="header"></header> and <footer data-site="footer"></footer> instead).
//
// To put a page in the nav: set its show to true, remove the robots noindex line from that page,
// and add it to sitemap.xml and llms.txt.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// page file -> the path it is served at
const PAGES = {
  "index.html": "/",
  "corvus/index.html": "/corvus/",
  "about.html": "/about.html",
  "contact.html": "/contact.html",
  "404.html": "/404.html",
};

const NAV = [
  { href: "/corvus/", label: "Corvus", show: true },
  { href: "/about.html", label: "About", show: false },
  { href: "/contact.html", label: "Contact", show: false },
];

const EMAIL = "kevin@corvusanalyticsllc.com";
const FINE =
  "The Corvus raven logo is a trademark of Corvus Analytics LLC. Corvus Analytics LLC is not a registered " +
  "investment adviser or broker-dealer. Nothing on this site is investment advice, or an offer to sell or a " +
  "solicitation of an offer to buy any security or any interest in any fund.";

function header(path) {
  const current = (href) => (href === path ? ' aria-current="page"' : "");
  const links = NAV.filter((item) => item.show)
    .map((item) => `<li><a href="${item.href}"${current(item.href)}>${item.label}</a></li>`)
    .join("");
  return [
    '<header class="site-header">',
    '    <div class="wrap header-inner">',
    `      <a class="brand" href="/"${current("/")}><span class="brand-mark"><img src="/assets/corvus-icon.svg" width="36" height="36" alt=""><span class="tm" aria-hidden="true">&trade;</span></span><span>Corvus Analytics</span></a>`,
    links ? `      <nav class="nav" aria-label="Primary"><ul>${links}</ul></nav>` : null,
    "    </div>",
    "  </header>",
  ].filter((line) => line !== null).join("\n");
}

function footer() {
  return [
    '<footer class="site-footer">',
    '    <div class="wrap footer-inner">',
    `      <p>&copy; ${new Date().getFullYear()} Corvus Analytics LLC</p>`,
    `      <p><a href="mailto:${EMAIL}">${EMAIL}</a></p>`,
    `      <p class="fine">${FINE}</p>`,
    "    </div>",
    "  </footer>",
  ].join("\n");
}

const block = (name, html) => `<!-- site:${name} -->\n  ${html}\n  <!-- /site:${name} -->`;

for (const [file, path] of Object.entries(PAGES)) {
  const at = `${ROOT}/${file}`;
  let s = fs.readFileSync(at, "utf8");
  const before = s;
  s = s.replace(/<!-- site:header -->[\s\S]*?<!-- \/site:header -->|<header data-site="header"><\/header>/, block("header", header(path)));
  s = s.replace(/<!-- site:footer -->[\s\S]*?<!-- \/site:footer -->|<footer data-site="footer"><\/footer>/, block("footer", footer()));
  if (!s.includes("<!-- site:header -->") || !s.includes("<!-- site:footer -->")) throw new Error(`${file}: no header or footer slot`);
  fs.writeFileSync(at, s);
  console.log(`${file}: ${s === before ? "unchanged" : "updated"}`);
}
