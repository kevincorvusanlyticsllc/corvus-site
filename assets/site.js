/*
 * Corvus Analytics: the header and footer every page shares.
 * Each page carries <header data-site="header"> and <footer data-site="footer">,
 * and this file fills them, so a nav change here applies everywhere.
 *
 * To put a page in the nav: set its show to true below, then remove the
 * robots noindex line from that page and add it to sitemap.xml.
 */
(() => {
  "use strict";

  const NAV = [
    { href: "/about.html", label: "About", show: false },
    { href: "/contact.html", label: "Contact", show: false },
  ];

  const EMAIL = "kevin@corvusanalyticsllc.com";

  const RAVEN =
    '<span class="brand-mark"><img src="/assets/corvus-icon.svg" width="36" height="36" alt="">' +
    '<span class="tm" aria-hidden="true">&trade;</span></span>';

  // "/", "/index.html", "/about" and "/about.html" all name a page the same way.
  const page = (path) => path.replace(/\.html$/, "").replace(/\/index$/, "/");
  const here = page(location.pathname);
  const current = (href) => (page(href) === here ? ' aria-current="page"' : "");

  const links = NAV.filter((item) => item.show)
    .map((item) => `<li><a href="${item.href}"${current(item.href)}>${item.label}</a></li>`)
    .join("");

  const header = document.querySelector('[data-site="header"]');
  if (header) {
    header.className = "site-header";
    header.innerHTML =
      '<div class="wrap header-inner">' +
      `<a class="brand" href="/"${current("/")}>${RAVEN}<span>Corvus Analytics</span></a>` +
      (links ? `<nav class="nav" aria-label="Primary"><ul>${links}</ul></nav>` : "") +
      "</div>";
  }

  const footer = document.querySelector('[data-site="footer"]');
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="wrap footer-inner">' +
      `<p>&copy; ${new Date().getFullYear()} Corvus Analytics LLC</p>` +
      `<p><a href="mailto:${EMAIL}">${EMAIL}</a></p>` +
      '<p class="fine">The Corvus raven logo is a trademark of Corvus Analytics LLC. Corvus Analytics LLC is not a registered investment adviser or broker-dealer. Nothing on this site is investment advice, or an offer to sell or a solicitation of an offer to buy any security or any interest in any fund.</p>' +
      "</div>";
  }
})();
