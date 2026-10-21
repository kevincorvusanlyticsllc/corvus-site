/*
 * The Corvus desk window on the home page. The orb is drawn the way the real window draws it:
 * a sphere of points that ripples with whoever is talking (green while it hears, violet-blue
 * while Corvus speaks). A scripted demo loops while the window is on screen, with sample
 * questions and answers only: written reads, the external model tier at work, what it learns.
 * Move over the orb and it turns toward the pointer and ripples with it; click it to mute.
 * The chart takes a crosshair.
 */
(() => {
  "use strict";

  const root = document.querySelector(".dx");
  if (!root) return;
  const $ = (sel) => root.querySelector(sel);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const orbEl = $(".dx-orb");
  const stateEl = $(".dx-state");
  const subEl = $(".dx-sub");
  const heardEl = $(".dx-line");
  const slotEl = $(".dx-slot");
  const feedEl = $(".dx-feed");
  const chart = $(".dx-chart svg");
  const trend = chart.querySelector(".cx-trend");
  const handles = chart.querySelectorAll(".cx-handle");

  // ---------- the orb ----------

  const COLORS = {
    speaking: ["#b69cff", "#6cb6ff"],
    hearing: ["#34d0a0", "#9ff5d6"],
    listening: ["#1d6b55", "#34d0a0"],
    muted: ["#3a4b59", "#7f93a3"],
  };
  const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  };
  const RGB = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, v.map(rgb)]));
  const LABEL = { speaking: "SPEAKING", hearing: "HEARING", listening: "LISTENING", muted: "MUTED" };

  // 520 points spread evenly over a sphere (a Fibonacci lattice), with each point's longitude
  const FIB = [];
  for (let i = 0; i < 520; i++) {
    const y = 1 - (i / 519) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.39996;
    FIB.push([Math.cos(th) * r, y, Math.sin(th) * r, Math.atan2(Math.sin(th) * r, Math.cos(th) * r)]);
  }

  const orb = {
    mode: "listening", muted: false, env: 0, col: null, syl: null, nextSyl: 0, spin: 0,
    hover: false, poke: 0, tx: 0, ty: 0, ax: 0, ay: 0,
  };
  const canvas = orbEl.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  let onScreen = false;
  let running = false;

  function setMode(mode) {
    orb.mode = mode;
    const shown = orb.muted ? "muted" : mode;
    orbEl.dataset.state = shown;
    stateEl.textContent = LABEL[shown];
  }

  // speech-like loudness: syllables of 110-280 ms, short gaps, now and then a pause
  function voice(now) {
    if (!orb.syl || now > orb.syl.t0 + orb.syl.d) {
      if (now < orb.nextSyl) return 0;
      const pause = Math.random() < 0.13;
      orb.syl = { t0: now, d: 110 + Math.random() * 170, p: 0.35 + Math.random() * 0.6 };
      orb.nextSyl = now + orb.syl.d + (pause ? 350 + Math.random() * 450 : 30 + Math.random() * 90);
    }
    return Math.pow(Math.sin(Math.PI * Math.min(1, (now - orb.syl.t0) / orb.syl.d)), 0.7) * orb.syl.p;
  }

  function loudness(now) {
    if (orb.muted) return 0.02;
    const v = orb.mode === "speaking" ? voice(now)
      : orb.mode === "hearing" ? voice(now) * 0.8
      : 0.05 + 0.03 * Math.sin(now * 0.002);
    // the pointer moving over the orb reads as a voice
    return Math.max(v, orb.poke);
  }

  function size() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const BINS = 6;
  let lastDraw = 0;
  function draw(now) {
    const dt = Math.min(64, now - (lastDraw || now));
    lastDraw = now;
    const want = loudness(now);
    orb.env += (want - orb.env) * (want > orb.env ? 0.45 : 0.12);
    orb.poke *= 0.92;
    orb.ax += (orb.tx - orb.ax) * 0.08;
    orb.ay += (orb.ty - orb.ay) * 0.08;

    // colours ease from one state to the next; a pointer over it while it listens is being heard
    const shown = orb.muted ? "muted" : orb.hover && orb.mode === "listening" ? "hearing" : orb.mode;
    const goal = RGB[shown];
    if (!orb.col) orb.col = goal.map((c) => [...c]);
    orb.col.forEach((c, k) => c.forEach((x, j) => { c[j] = x + (goal[k][j] - x) * (calm ? 1 : 0.08); }));

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w) return;
    const e = orb.env;
    ctx.clearRect(0, 0, w, h);
    orb.spin += calm ? 0 : dt * ((orb.mode === "speaking" ? 0.0005 : 0.00025) + e * 0.0004);
    const yaw = orb.spin + orb.ax;
    const tilt = 0.35 + orb.ay;
    const cx = w / 2;
    // sat a little high, so Corvus's spoken line below it stays clear
    const cy = h * 0.45;
    const R = Math.min(w, h) * 0.28 * (1 + e * 0.06);
    const ca = Math.cos(yaw), sa = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    const [c0, c1] = orb.col.map((x) => x.map(Math.round).join(","));

    // a faint core, brighter as the voice rises
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
    glow.addColorStop(0, `rgba(${c1},${0.08 + e * 0.22})`);
    glow.addColorStop(1, `rgba(${c0},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.1, 0, 7);
    ctx.fill();

    // the points go out in six batches by depth, one fill each
    ctx.globalCompositeOperation = "lighter";
    const bins = Array.from({ length: BINS }, () => new Path2D());
    const t6 = now * 0.006, t4 = now * 0.004;
    for (const p of FIB) {
      const x = p[0] * ca + p[2] * sa;
      const z = -p[0] * sa + p[2] * ca;
      const y2 = p[1] * ct - z * st;
      const z2 = p[1] * st + z * ct;
      const d = 1 + e * 0.34 * Math.sin(3 * p[3] + t6) * Math.cos(4 * p[1] + t4);
      const s = 2.6 / (2.6 + z2);
      const depth = (1 - z2) / 2;
      const px = cx + x * R * d * s;
      const py = cy + y2 * R * d * s;
      const r = 0.6 + 1.6 * depth * (1 + e * 0.6);
      const bin = bins[Math.min(BINS - 1, (depth * BINS) | 0)];
      bin.moveTo(px + r, py);
      bin.arc(px, py, r, 0, 6.2832);
    }
    // the near half in the light colour, the far half in the deep one; nearer is brighter
    bins.forEach((bin, k) => {
      ctx.fillStyle = `rgba(${k >= BINS / 2 ? c1 : c0},${(0.22 + (0.72 * (k + 0.5)) / BINS).toFixed(3)})`;
      ctx.fill(bin);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  // 60 frames a second while someone talks, 30 when it's quiet, none off screen
  let lastFrame = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!onScreen) return;
    const busy = orb.mode !== "listening" || orb.hover || orb.env > 0.12;
    if (now - lastFrame < (busy ? 15 : 31)) return;
    lastFrame = now;
    draw(now);
  }

  orbEl.addEventListener("pointerenter", () => { orb.hover = true; });
  orbEl.addEventListener("pointerleave", () => {
    orb.hover = false;
    orb.tx = 0;
    orb.ty = 0;
  });
  orbEl.addEventListener("pointermove", (ev) => {
    const box = orbEl.getBoundingClientRect();
    orb.tx = ((ev.clientX - box.left) / box.width - 0.5) * 1.4;
    orb.ty = ((ev.clientY - box.top) / box.height - 0.5) * 0.9;
    if (!orb.muted) orb.poke = Math.min(0.9, orb.poke + Math.hypot(ev.movementX, ev.movementY) * 0.012);
  });
  orbEl.addEventListener("click", () => {
    orb.muted = !orb.muted;
    setMode(orb.mode);
    subEl.textContent = orb.muted ? "Muted. Click to listen." : "";
    sync();
    if (calm) draw(performance.now());
  });

  // ---------- the chart's crosshair ----------

  const cross = chart.querySelector(".dx-cross");
  const vLine = cross.querySelector(".v");
  const hLine = cross.querySelector(".h");
  const candles = [...chart.querySelectorAll(".cx-up, .cx-down")].map((g) => ({ g, x: Number(g.querySelector("line").getAttribute("x1")) }));
  let hot = null;
  chart.addEventListener("pointermove", (ev) => {
    const m = chart.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    vLine.setAttribute("x1", p.x);
    vLine.setAttribute("x2", p.x);
    hLine.setAttribute("y1", p.y);
    hLine.setAttribute("y2", p.y);
    cross.classList.add("on");
    const near = candles.reduce((a, c) => (Math.abs(c.x - p.x) < Math.abs(a.x - p.x) ? c : a));
    const next = Math.abs(near.x - p.x) < 10 ? near.g : null;
    if (next !== hot) {
      hot?.classList.remove("hot");
      hot = next;
      hot?.classList.add("hot");
    }
  });
  chart.addEventListener("pointerleave", () => {
    cross.classList.remove("on");
    hot?.classList.remove("hot");
    hot = null;
  });

  // ---------- the demo ----------

  function sync() {
    running = onScreen && !document.hidden && !orb.muted;
  }

  // waits that stop while the window is off screen, the tab is hidden, or Corvus is muted
  const sleep = (ms) => new Promise((done) => {
    let left = ms;
    let at = performance.now();
    const tick = (now) => {
      if (running) left -= now - at;
      at = now;
      if (left <= 0) done();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const KIND = { verb: "action", qty: "quantity", sym: "symbol", exp: "expiry", con: "contract", px: "price" };

  function heardSpans(parts) {
    heardEl.textContent = "";
    heardEl.classList.remove("none");
    return parts.map(([text, kind]) => {
      const span = document.createElement("span");
      if (kind) {
        span.className = `tk ${kind}`;
        span.dataset.k = KIND[kind];
      }
      heardEl.append(span);
      return [span, text];
    });
  }

  async function hear(parts) {
    setMode("hearing");
    subEl.textContent = "";
    heardEl.classList.add("typing");
    for (const [span, text] of heardSpans(parts)) {
      for (const ch of text) {
        span.textContent += ch;
        await sleep(ch === " " ? 40 : 55);
      }
    }
    heardEl.classList.remove("typing");
    feed("heard", heardEl.textContent);
    await sleep(350);
  }

  async function say(text) {
    setMode("speaking");
    subEl.textContent = "";
    for (const ch of text) {
      subEl.textContent += ch;
      await sleep(28);
    }
    await sleep(900);
    setMode("listening");
  }

  function feed(kind, text) {
    const row = document.createElement("div");
    const t = document.createElement("span");
    t.className = "t";
    t.textContent = new Date().toLocaleTimeString("en-GB", { hourCycle: "h23" });
    const m = document.createElement("span");
    m.className = kind;
    m.textContent = text;
    row.append(t, m);
    feedEl.append(row);
    while (feedEl.children.length > 6) feedEl.firstElementChild.remove();
  }

  const trendLength = trend.getTotalLength();
  function trendOff() {
    trend.style.transition = "none";
    trend.style.strokeDasharray = `${trendLength}`;
    trend.style.strokeDashoffset = `${trendLength}`;
    handles.forEach((h) => { h.style.opacity = "0"; });
  }
  function trendOn() {
    void trend.getBoundingClientRect();
    trend.style.transition = "stroke-dashoffset 1.2s ease-out";
    trend.style.strokeDashoffset = "0";
    handles.forEach((h) => { h.style.opacity = "1"; });
  }

  // ---------- the written answer, the brain and what it has learned ----------

  const viewEl = $(".dx-view");
  const viewLbl = $(".dx-view-lbl");
  const ansTitle = $(".dx-ans-title");
  const ansBody = $(".dx-ans-body");
  const ansRead = $(".dx-ans-read");
  const learnedEl = $(".dx-learned");
  const tiers = [...root.querySelectorAll(".dx-brain [data-tier]")];

  // the external model tiers at work: fast (phrasing, memory), core (conversation), expert
  function using(...names) {
    tiers.forEach((el) => el.classList.toggle("on", names.includes(el.dataset.tier)));
  }

  // the raven goes in front of "Corvus wrote", as in the real window
  function label(head, note) {
    viewLbl.querySelector(".h").textContent = head;
    viewLbl.querySelector(".n").textContent = note;
    viewLbl.querySelector(".dx-mark").hidden = head !== "Corvus wrote";
  }

  function showChart() {
    viewEl.classList.remove("ans");
    label("Chart", "drawn by Corvus");
  }

  function showAnswer({ title, via, points, read }) {
    ansTitle.textContent = title;
    ansBody.replaceChildren(...points.map(([head, text]) => {
      const li = document.createElement("li");
      const b = document.createElement("b");
      b.textContent = head;
      li.append(b, text);
      return li;
    }));
    ansRead.textContent = read;
    viewEl.classList.add("ans");
    label("Corvus wrote", via);
  }

  function learn(kind, text) {
    // a later loop of the demo learns the same thing again: move it to the top, not twice
    [...learnedEl.children].find((el) => el.lastElementChild.textContent === text)?.remove();
    const li = document.createElement("li");
    li.className = "new";
    const b = document.createElement("b");
    b.textContent = kind;
    const s = document.createElement("span");
    s.textContent = text;
    li.append(b, s);
    learnedEl.prepend(li);
    while (learnedEl.children.length > 3) learnedEl.lastElementChild.remove();
  }

  // ---------- the scenes (sample questions and answers, not live data) ----------

  const BOOK_Q = [["what's driving my book ahead of the "], ["Nasdaq", "sym"], [" today?"]];
  const BOOK = {
    title: "What's driving your book today",
    via: "core model · factor read",
    points: [
      ["Market", "Working for you. The book moves close to one for one with the index, so the rally shows up in full."],
      ["Small caps", "The biggest lift. The Russell is leading today, and your tilt toward it is adding the most."],
      ["Energy", "Firm crude is adding on top of the market move."],
      ["Options", "The short-dated calls are gaining faster from the move than time is costing them."],
    ],
    read: "Read: the tilts are adding on top of the market, and small caps are today's biggest contributor.",
  };
  const BOOK_SAID = "You're ahead of the Nasdaq, and the tilts are doing it. Small caps lead; the full breakdown is on screen.";

  const REGIME = {
    title: "Regime and positioning",
    via: "expert model · macro and factor read",
    points: [
      ["The tape", "For a month it has traded like growth picking up with inflation steady: cyclicals and small caps lead."],
      ["Your book", "Built the same way: growth and momentum names, light on duration."],
      ["The fit", "You're positioned with the regime, so the trend is doing the work for you."],
      ["What to watch", "The next growth print, and whether bonds start to rally on the up days."],
    ],
    read: "Read: aligned with the tape. I'll flag it the moment the growth data turns.",
  };

  const RATES = {
    title: "This morning's rate news and your book",
    via: "core model · news and factor read",
    points: [
      ["The news", "Yields eased after the morning data, and the accounts you follow read it as room for the Fed to stay patient."],
      ["Your exposure", "The book's rate sensitivity runs through small caps and long-duration growth names."],
      ["The effect", "Both tend to gain when yields ease, so the move lines up with how the book is built."],
      ["Sources", "The news wire, the posts you follow and the factor model, read together."],
    ],
    read: "Read: a tailwind for the book, led by small caps and long-duration growth.",
  };

  const ORDER = [["buy", "verb"], [" "], ["two", "qty"], [" "], ["SPY", "sym"], [" "], ["Friday", "exp"], [" "], ["700 calls", "con"], [" at "], ["4.20", "px"]];

  async function sceneBook() {
    await hear(BOOK_Q);
    using("core");
    feed("answer", "factor read · what's driving the book");
    await sleep(1100);
    showAnswer(BOOK);
    await say(BOOK_SAID);
    using();
    await sleep(4200);
  }

  async function scenePhrasing() {
    await hear([["throw", "verb"], [" the "], ["Russell", "sym"], [" up on the bottom right"]]);
    using("fast");
    feed("answer", "new phrasing · read by the fast model");
    await sleep(800);
    using();
    feed("answer", "charted /RTY on the bottom right");
    await say("Russell futures are up on the bottom right.");
    await hear([["perfect"]]);
    learn("phrasing", "“throw the Russell up on the bottom right” = chart /RTY, bottom right");
    feed("sent", "learned a phrasing · handled locally from now on");
    await sleep(1600);
  }

  async function sceneTrend() {
    showChart();
    trendOff();
    await sleep(600);
    await hear([["chart", "verb"], [" "], ["the Nasdaq", "sym"], [" and map out the trend"]]);
    using("core");
    trendOn();
    feed("answer", "drew a trend line through the last two lows");
    await say("Drawn. It's holding the rising line from the last two lows.");
    using();
    await sleep(1600);
  }

  async function sceneRegime() {
    await hear([["what regime are we in, and how is my book positioned for it?"]]);
    using("core");
    await sleep(700);
    using("core", "expert");
    feed("answer", "consulting the expert model · regime and positioning");
    await sleep(1400);
    showAnswer(REGIME);
    await say("You're positioned with the tape, so the trend is doing the work. Details on screen.");
    using();
    await sleep(4200);
  }

  async function sceneOrder() {
    showChart();
    await hear(ORDER);
    slotEl.classList.add("up");
    feed("ticket", "BUY 2 SPY Fri 700C @ 4.20 LMT");
    await say("Two SPY Friday 700 calls, limit 4.20. Say send.");
    await sleep(900);
    await hear([["send", "verb"], [" it"]]);
    slotEl.classList.add("sent");
    feed("sent", "sent · dry run, nothing routed");
    await say("Sent. Dry run, so nothing went out.");
    await sleep(1400);
    slotEl.classList.remove("up", "sent");
    await sleep(900);
  }

  async function sceneMemory() {
    await hear([["what was our plan for "], ["TLT", "sym"], [" this morning?"]]);
    using("core");
    feed("answer", "recalled · this morning's log and notes");
    await sleep(700);
    await say("You planned to add after the auction, once the result was in. It's in, so the plan is ready when you are.");
    using();
    await sleep(1600);
  }

  async function sceneRates() {
    await hear([["how does this morning's rate news play for my book?"]]);
    using("fast", "core");
    feed("answer", "news · read the wire and the posts you follow");
    await sleep(1000);
    using("core");
    feed("answer", "factor model · the book's rate sensitivity, by holding");
    await sleep(1000);
    showAnswer(RATES);
    await say("Good for the book. Lower yields favor how it's built, and small caps and long-duration growth gain the most.");
    using();
    await sleep(4200);
  }

  async function demo() {
    feed("answer", "Corvus is listening");
    trendOff();
    await sleep(900);
    for (;;) {
      await sceneBook();
      await scenePhrasing();
      await sceneTrend();
      await sceneRates();
      await sceneRegime();
      await sceneOrder();
      await sceneMemory();
    }
  }

  // reduced motion: one still frame of a written answer
  function still() {
    heardSpans(BOOK_Q).forEach(([span, text]) => { span.textContent = text; });
    showAnswer(BOOK);
    subEl.textContent = BOOK_SAID;
    feed("heard", heardEl.textContent);
    feed("answer", "factor read · what's driving the book");
    using("core");
    setMode("listening");
  }

  size();
  new ResizeObserver(() => {
    size();
    if (calm) draw(performance.now());
  }).observe(canvas);
  new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }, { threshold: 0.15 }).observe(root);
  document.addEventListener("visibilitychange", sync);

  if (calm) {
    still();
    draw(performance.now());
    return;
  }
  requestAnimationFrame(frame);
  demo();
})();
