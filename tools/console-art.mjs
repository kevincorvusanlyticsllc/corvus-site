// Generates the chart elements for the Corvus desk window in index.html (the waveform it also
// prints is no longer used). Abstract art: no prices, tickers or axes are drawn. The page uses
// seed 7 and a bottom of 300 (viewBox "296 92 400 220").
// Run: node tools/console-art.mjs 7 300 > chart.svgfrag, then paste the elements into the .dx-chart <svg>.
const seed = Number(process.argv[2] ?? 253);
const bottom = Number(process.argv[3] ?? 392);
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = mulberry32(seed);
const N = 26;
let p = 100;
const rows = [];
for (let i = 0; i < N; i++) {
  const drift = i >= 11 && i <= 14 ? -1.0 : 0.62;
  const o = p;
  const c = o + drift + (r() - 0.5) * 2.0;
  rows.push({ o, c, h: Math.max(o, c) + 0.2 + r() * 1.0, l: Math.min(o, c) - 0.2 - r() * 1.0 });
  p = c;
}
// band: EMA(6) of closes +- 1.9 x average range
const k = 2 / 7;
let ema = rows[0].c;
const band = rows.map((row, i) => {
  ema = i ? row.c * k + ema * (1 - k) : ema;
  const win = rows.slice(Math.max(0, i - 5), i + 1);
  const atr = win.reduce((s, w) => s + (w.h - w.l), 0) / win.length;
  return { hi: ema + 1.9 * atr, lo: ema - 1.9 * atr };
});
const lo = Math.min(...rows.map((x) => x.l), ...band.map((b) => b.lo));
const hi = Math.max(...rows.map((x) => x.h), ...band.map((b) => b.hi));
const X0 = 316, X1 = 668, Y0 = bottom, Y1 = 104;
const step = (X1 - X0) / (N - 1);
const x = (i) => X0 + i * step;
const y = (v) => Y0 - ((v - lo) / (hi - lo)) * (Y0 - Y1);
const f = (n) => Math.round(n * 10) / 10;

// trend line: lowest low early, then the anchor that keeps every later low above the line
let i1 = 0;
for (let i = 1; i < 6; i++) if (rows[i].l < rows[i1].l) i1 = i;
let i2 = -1, best = Infinity;
for (let j = i1 + 4; j < N - 3; j++) {
  const s = (rows[j].l - rows[i1].l) / (j - i1);
  if (s < best) { best = s; i2 = j; }
}
const lineAt = (i) => rows[i1].l + best * (i - i1);
const out = [];
out.push(`<path class="cx-grid" d="${[0, 1, 2, 3, 4].map((g) => `M300 ${f(Y1 + ((Y0 - Y1) * g) / 4)}H692`).join("")}"/>`);
const up = band.map((b, i) => `${f(x(i))},${f(y(b.hi))}`);
const dn = band.map((b, i) => `${f(x(i))},${f(y(b.lo))}`);
out.push(`<polygon class="cx-band" points="${[...up, ...dn.reverse()].join(" ")}"/>`);
out.push(`<polyline class="cx-band-edge" points="${up.join(" ")}"/>`);
out.push(`<polyline class="cx-band-edge" points="${band.map((b, i) => `${f(x(i))},${f(y(b.lo))}`).join(" ")}"/>`);
for (const [i, row] of rows.entries()) {
  const cls = row.c >= row.o ? "cx-up" : "cx-down";
  const top = y(Math.max(row.o, row.c)), bot = y(Math.min(row.o, row.c));
  out.push(`<g class="${cls}"><line x1="${f(x(i))}" y1="${f(y(row.h))}" x2="${f(x(i))}" y2="${f(y(row.l))}"/><rect x="${f(x(i) - 4)}" y="${f(top)}" width="8" height="${f(Math.max(1.5, bot - top))}" rx="1.5"/></g>`);
}
const xe = 692;
const ie = (xe - X0) / step;
out.push(`<line class="cx-trend" x1="${f(x(i1))}" y1="${f(y(lineAt(i1)))}" x2="${xe}" y2="${f(y(lineAt(ie)))}"/>`);
out.push(`<circle class="cx-handle" cx="${f(x(i1))}" cy="${f(y(lineAt(i1)))}" r="5"/>`);
out.push(`<circle class="cx-handle" cx="${f(x(i2))}" cy="${f(y(lineAt(i2)))}" r="5"/>`);
const last = rows[N - 1];
out.push(`<line class="cx-last" x1="${f(x(N - 1) + 6)}" y1="${f(y(last.c))}" x2="${xe}" y2="${f(y(last.c))}"/>`);
out.push(`<circle class="cx-last-dot" cx="${xe}" cy="${f(y(last.c))}" r="3.5"/>`);

// waveform: 30 bars across the left panel, centered on y=372
const wave = [];
for (let i = 0; i < 30; i++) {
  const env = Math.sin((Math.PI * (i + 0.5)) / 30);
  const h = 4 + 34 * env * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));
  wave.push(`<rect x="${f(26 + i * 7.6)}" y="${f(372 - h / 2)}" width="4" height="${f(h)}" rx="2"/>`);
}
console.log(`<!-- seed ${seed}: anchors ${i1}, ${i2}; slope ${best.toFixed(3)} -->`);
console.log(`<g class="cx-wave">${wave.join("")}</g>`);
console.log(out.join("\n"));
