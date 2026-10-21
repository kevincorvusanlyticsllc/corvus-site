// Low-poly 3D raven bust with a third eye. Writes assets/corvus-mark.svg (hero), assets/corvus-icon.svg
// (header and small sizes, brighter) and assets/favicon.svg (on a tile).
// Silhouette -> Delaunay mesh -> height field from distance to the edge -> two-light facet shading.
// Run: node tools/raven3d.mjs [outDir] [seed]
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = process.argv[2] ?? fileURLToPath(new URL("../assets", import.meta.url));
const SEED = Number(process.argv[3] ?? 21);

// Raven head and chest in profile, facing right (200 x 200, y down).
const P = [
  [194, 90], [178, 76], [162, 66], [146, 58], [132, 50], [116, 43], [98, 41], [80, 45], [66, 55], [58, 70],
  [52, 92], [46, 118], [40, 146], [36, 172], [34, 196], [124, 196], [128, 182], [134, 166], [140, 152], [146, 146],
  [157, 150], [149, 134], [159, 138], [151, 122], [160, 126], [153, 110], [160, 113], [154, 100], [150, 95],
  [168, 93], [184, 91],
];
const EYE = [127, 61];
const THIRD = [105, 56];

function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(SEED);

const inside = ([x, y]) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const edgeDist = (p) => Math.min(...P.map((a, i) => segDist(p, a, P[(i + 1) % P.length])));

// Points: the outline, subdivided; a jittered interior grid; rings that seat the two eyes.
const pts = [];
const near = (p, q, d) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d;
for (const [i, a] of P.entries()) {
  const b = P[(i + 1) % P.length];
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 13));
  for (let k = 0; k < n; k++) pts.push({ x: a[0] + ((b[0] - a[0]) * k) / n, y: a[1] + ((b[1] - a[1]) * k) / n, edge: true });
}
for (let y = 20; y < 200; y += 15) {
  for (let x = 30; x < 196; x += 15) {
    const p = [x + (r() - 0.5) * 10, y + (r() - 0.5) * 10];
    if (inside(p) && edgeDist(p) > 6 && !near(p, EYE, 15) && !near(p, THIRD, 15)) pts.push({ x: p[0], y: p[1] });
  }
}
for (const [c, n, rad] of [[EYE, 7, 10.5], [THIRD, 6, 12]]) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.3;
    const p = [c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad * (c === THIRD ? 1.25 : 1)];
    if (inside(p) && edgeDist(p) > 3) pts.push({ x: p[0], y: p[1], ring: c });
  }
}

// Bowyer-Watson Delaunay.
function delaunay(points) {
  const sup = [{ x: -1e4, y: -1e4 }, { x: 1e4, y: -1e4 }, { x: 0, y: 1e4 }];
  const all = [...points, ...sup];
  const S = points.length;
  let tris = [[S, S + 1, S + 2]];
  const circ = ([a, b, c]) => {
    const A = all[a], B = all[b], C = all[c];
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    const ux = ((A.x ** 2 + A.y ** 2) * (B.y - C.y) + (B.x ** 2 + B.y ** 2) * (C.y - A.y) + (C.x ** 2 + C.y ** 2) * (A.y - B.y)) / d;
    const uy = ((A.x ** 2 + A.y ** 2) * (C.x - B.x) + (B.x ** 2 + B.y ** 2) * (A.x - C.x) + (C.x ** 2 + C.y ** 2) * (B.x - A.x)) / d;
    return { ux, uy, r2: (A.x - ux) ** 2 + (A.y - uy) ** 2 };
  };
  for (let i = 0; i < S; i++) {
    const p = all[i];
    const bad = tris.filter((t) => { const c = circ(t); return (p.x - c.ux) ** 2 + (p.y - c.uy) ** 2 < c.r2; });
    const edges = new Map();
    for (const t of bad) for (const [u, v] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
      const k = u < v ? `${u},${v}` : `${v},${u}`;
      edges.set(k, edges.has(k) ? null : [u, v]);
    }
    tris = tris.filter((t) => !bad.includes(t));
    for (const e of edges.values()) if (e) tris.push([e[0], e[1], i]);
  }
  return tris.filter((t) => t.every((v) => v < S));
}

const tris = delaunay(pts).filter((t) => {
  const v = t.map((i) => [pts[i].x, pts[i].y]);
  const probes = [];
  for (let a = 0; a < 3; a++) for (const f of [0.25, 0.5, 0.75]) {
    const b = (a + 1) % 3;
    probes.push([v[a][0] + (v[b][0] - v[a][0]) * f, v[a][1] + (v[b][1] - v[a][1]) * f]);
  }
  probes.push([(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3]);
  return probes.every((q) => inside(q) || edgeDist(q) < 0.6);
});

// Height: a dome from the distance to the edge, a raised brow, a little jitter for facets.
const H = 46, D = 42;
for (const p of pts) {
  const d = Math.min(1, edgeDist([p.x, p.y]) / D);
  let z = H * (1 - (1 - d) ** 2);
  if (p.x > 140) z *= 0.75; // the beak is narrower than the head
  z += 6 * Math.exp(-((p.x - 118) ** 2 + (p.y - 52) ** 2) / 260); // brow
  if (p.ring) z -= 4; // eye sockets
  if (!p.edge) z += (r() - 0.5) * 6;
  p.z = Math.max(0, z);
}

const norm = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const KEY = norm([-0.5, -0.8, 0.75]);
const RIM = norm([0.95, -0.25, 0.2]);
const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);
const VIOLET = [123, 108, 255], TEAL = [40, 210, 200], BLUE = [70, 120, 255], CYAN = [110, 235, 255];

// gain lifts the sheen for small sizes, where the full-size shading reads as a dark blob.
const shade = (gain) => tris.map((t) => {
  const [A, B, C] = t.map((i) => pts[i]);
  let n = norm([
    (B.y - A.y) * (C.z - A.z) - (B.z - A.z) * (C.y - A.y),
    (B.z - A.z) * (C.x - A.x) - (B.x - A.x) * (C.z - A.z),
    (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x),
  ]);
  if (n[2] < 0) n = n.map((c) => -c);
  const kd = Math.max(0, dot(n, KEY));
  const kr = Math.max(0, dot(n, RIM)) ** 2;
  const sheen = mix(mix(VIOLET, BLUE, Math.min(1, Math.max(0, 0.5 + n[0]))), TEAL, Math.min(1, Math.max(0, 0.35 + n[1] * 0.9)) * 0.6);
  const cx = (A.x + B.x + C.x) / 3;
  const beak = cx > 142 ? 0.7 : 1;
  const col = [9, 10, 20].map((b, i) => b + sheen[i] * (0.09 + 0.5 * kd ** 2.2) * beak * gain + 255 * 0.18 * kd ** 14 + CYAN[i] * 0.28 * gain * kr ** 2.5);
  const hex = "#" + col.map((c) => Math.round(Math.min(255, c)).toString(16).padStart(2, "0")).join("");
  const pts2 = [A, B, C].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return `<polygon points="${pts2}" fill="${hex}" stroke="${hex}"/>`;
});

const [ex, ey] = EYE, [tx, ty] = THIRD;
const almond = (cx, cy, h, w) => `M${cx} ${cy - h}C${cx + w} ${cy - h * 0.45} ${cx + w} ${cy + h * 0.45} ${cx} ${cy + h}C${cx - w} ${cy + h * 0.45} ${cx - w} ${cy - h * 0.45} ${cx} ${cy - h}Z`;

// tm puts the trademark symbol at the logo's upper right (the hero size only; too small to read elsewhere)
function svg({ viewBox, halo, fade, title, gain = 1, edge = 1, tile = false, tm = false }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}">
<title>${title}</title>
<defs>
<radialGradient id="halo" cx="108" cy="104" r="100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7b6cff" stop-opacity=".42"/><stop offset=".55" stop-color="#4a3fc0" stop-opacity=".1"/><stop offset="1" stop-color="#4a3fc0" stop-opacity="0"/></radialGradient>
<radialGradient id="iris" cx="${tx}" cy="${ty - 1}" r="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#a8f4ff"/><stop offset=".75" stop-color="#7f74ff"/><stop offset="1" stop-color="#4b3cd6"/></radialGradient>
<linearGradient id="edge" x1="0" y1="40" x2="0" y2="190" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b9b3ff"/><stop offset=".5" stop-color="#7b6cff" stop-opacity=".55"/><stop offset="1" stop-color="#7b6cff" stop-opacity="0"/></linearGradient>
<linearGradient id="fade" x1="0" y1="140" x2="0" y2="196" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="m"><rect x="0" y="0" width="200" height="200" fill="url(#fade)"/></mask>
<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter>
</defs>
<style>
.pulse{animation:pulse 4s ease-in-out infinite}
@keyframes pulse{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){.pulse{animation:none}}
</style>
${tile ? `<rect x="54" y="30" width="142" height="142" rx="30" fill="#0b0c10" stroke="#2f3442" stroke-width="3"/>` : ""}
${halo ? `<circle cx="108" cy="104" r="100" fill="url(#halo)"/>` : ""}
<g${fade ? ` mask="url(#m)"` : ""} stroke-width=".6" stroke-linejoin="round">
${shade(gain).join("\n")}
<path d="M${P.map((p) => p.join(" ")).join(" ")}Z" fill="none" stroke="url(#edge)" stroke-width="${edge}"/>
</g>
<circle cx="${ex}" cy="${ey}" r="4.6" fill="#05060c" stroke="#8d97ff" stroke-width="1.1"/>
<circle cx="${ex - 1.7}" cy="${ey - 1.8}" r="1.3" fill="#fff"/>
<path class="pulse" d="${almond(tx, ty, 10, 7)}" fill="#8fe9ff" filter="url(#glow)"/>
<path d="${almond(tx, ty, 7.2, 4.6)}" fill="url(#iris)" stroke="#d9fbff" stroke-width=".6"/>
<ellipse cx="${tx}" cy="${ty}" rx="1.1" ry="3.9" fill="#07081a"/>
<circle cx="${tx - 1.2}" cy="${ty - 2.6}" r=".8" fill="#fff"/>
${tm ? `<text x="197" y="52" text-anchor="end" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" font-size="14" font-weight="600" fill="#a3a6b4">™</text>` : ""}
</svg>
`;
}

fs.writeFileSync(`${OUT}/corvus-mark.svg`, svg({ viewBox: "0 0 200 200", halo: true, fade: true, title: "Corvus Analytics", tm: true }));
fs.writeFileSync(`${OUT}/corvus-icon.svg`, svg({ viewBox: "54 30 142 142", halo: false, fade: true, title: "Corvus Analytics", gain: 1.9, edge: 3 }));
fs.writeFileSync(`${OUT}/favicon.svg`, svg({ viewBox: "54 30 142 142", halo: false, fade: true, title: "Corvus Analytics", gain: 2.2, edge: 4, tile: true }));
console.log(`points ${pts.length}, faces ${tris.length}`);
