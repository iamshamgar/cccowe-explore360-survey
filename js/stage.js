/* ============================================================================
   CCCOWE 2026 Explore360 — STAGE / PROJECTOR engine
   Persistent giant KPI band + a single big hero chart that AUTO-ROTATES
   through the key visuals (Q8 tensions first). Reads the live Sheet via the
   shared pipeline (js/sheet-data.js) and polls for updates.

   URL flags:  ?noanim=1  freeze animations + hold on one panel (screenshots)
               ?panel=N   start on panel index N (0 = Q8)
               ?sheet=URL test against any published Sheet/CSV
   ============================================================================ */
(function () {
  "use strict";
  const cfg = EXPLORE360;

  const css = getComputedStyle(document.documentElement);
  const V = (n) => css.getPropertyValue(n).trim();
  const TEAL = V("--s-teal"), GOLD = V("--s-gold"), ROSE = V("--s-rose"),
        BLUE = V("--s-blue"), VIOLET = V("--s-violet"), GREEN = V("--s-green"),
        TEXT = V("--s-text"), MUTED = V("--s-muted"), GRID = "rgba(255,255,255,.08)";

  const params = new URLSearchParams(location.search);
  const NOANIM = params.has("noanim") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const DWELL_MS = 13000;

  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.color = MUTED;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.enabled = false;

  /* ---------- viewport-scaled font sizes ---------- */
  let U = 1, TICK = 28, VALF = 34, AXIS = 22;
  function computeFonts() {
    U = Math.max(0.55, window.innerWidth / 1920);
    TICK = Math.round(27 * U);
    VALF = Math.round(34 * U);
    AXIS = Math.round(20 * U);
  }

  /* ---------- aggregation ---------- */
  const lab = (g) => g.labels;
  function countSingle(data, f, g) { const c = {}; g.order.forEach((k) => (c[k] = 0)); data.forEach((r) => { if (c.hasOwnProperty(r[f])) c[r[f]]++; }); return c; }
  function countMulti(data, f, g) { const c = {}; g.order.forEach((k) => (c[k] = 0)); data.forEach((r) => (r[f] || []).forEach((k) => { if (c.hasOwnProperty(k)) c[k]++; })); return c; }
  function rankedPairs(counts, g, topN) {
    let p = Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => [g.labels[k], v]);
    return topN ? p.slice(0, topN) : p;
  }
  function orderedPairs(counts, g) { return g.order.map((k) => [g.labels[k], counts[k]]).filter((p) => p[1] > 0); }

  function wrap(str, max) {
    const words = String(str).split(" ");
    const lines = []; let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur.trim()); cur = w; }
      else cur = (cur + " " + w).trim();
    }
    if (cur) lines.push(cur.trim());
    return lines;
  }

  /* ---------- big value-label plugin ---------- */
  const valueLabels = {
    id: "vlabels",
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      const horizontal = chart.options.indexAxis === "y";
      ctx.save();
      ctx.fillStyle = TEXT;
      ctx.font = "700 " + VALF + "px Inter";
      meta.data.forEach((bar, i) => {
        const v = chart.data.datasets[0].data[i];
        if (v == null) return;
        if (horizontal) { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(v, bar.x + 14 * U, bar.y); }
        else { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(v, bar.x, bar.y - 10 * U); }
      });
      ctx.restore();
    },
  };

  /* ---------- panel definitions (rotation order) ---------- */
  const PANELS = [
    {
      q: "Q8", title: "Most pressing tensions",
      sub: (d) => "Select up to 3 · " + d.length + " delegates",
      build: (d) => {
        const p = rankedPairs(countMulti(d, "q8_tensions", cfg.q8_tensions), cfg.q8_tensions, 7);
        const colors = p.map((_, i) => (i === 0 ? ROSE : i === 1 ? "#ff9aa8" : TEAL));
        return hbar(p, colors);
      },
    },
    {
      q: "Q9", title: "How hopeful is the room?",
      sub: (d) => { const a = avg(d); return "Average " + a.toFixed(1) + " of 5"; },
      build: (d) => {
        const c = {}; [1, 2, 3, 4, 5].forEach((n) => (c[n] = 0));
        d.forEach((r) => { if (typeof r.q9_hope === "number") c[r.q9_hope]++; });
        const pairs = [["1", c[1]], ["2", c[2]], ["3", c[3]], ["4", c[4]], ["5", c[5]]];
        return vbar(pairs, [ROSE, "#f0895f", GOLD, "#7fd08a", TEAL],
          "1 = not hopeful at all      5 = extremely hopeful");
      },
    },
    {
      q: "Q1", title: "Countries in the room",
      sub: (d) => new Set(d.map((r) => (r.q1_country || "").trim()).filter(Boolean)).size + " represented",
      build: (d) => {
        const cc = {}; d.forEach((r) => { const k = (r.q1_country || "").trim(); if (k) cc[k] = (cc[k] || 0) + 1; });
        const p = Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 8);
        return hbar(p, p.map(() => TEAL));
      },
    },
    {
      q: "Q5", title: "Communities in our congregations",
      sub: (d) => "Select all that apply",
      build: (d) => hbar(rankedPairs(countMulti(d, "q5_communities", cfg.q5_communities), cfg.q5_communities, 7).map(shorten), null, VIOLET),
    },
    {
      q: "Q7", title: "Where the next generation goes",
      sub: (d) => "As young people reach adulthood",
      build: (d) => hbar(rankedPairs(countSingle(d, "q7_youth", cfg.q7_youth), cfg.q7_youth, 6), null, BLUE),
    },
    {
      q: "Q10", title: "What gives us hope",
      sub: (d) => "Select all that apply",
      build: (d) => hbar(rankedPairs(countMulti(d, "q10_hope_sources", cfg.q10_hope_sources), cfg.q10_hope_sources, 7).map(shorten), null, GREEN),
    },
  ];

  function shorten(pair) { return [pair[0].length > 34 ? pair[0].slice(0, 33) + "…" : pair[0], pair[1]]; }
  function avg(d) { const v = d.map((r) => r.q9_hope).filter((x) => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }

  /* ---------- chart config builders ---------- */
  function hbar(pairs, colors, single) {
    return {
      type: "bar",
      data: {
        labels: pairs.map((p) => wrap(p[0], 24)),
        datasets: [{ data: pairs.map((p) => p[1]), backgroundColor: colors || pairs.map(() => single), borderRadius: 8 * U, borderSkipped: false, maxBarThickness: 64 * U }],
      },
      options: {
        indexAxis: "y",
        responsive: true, maintainAspectRatio: false,
        animation: NOANIM ? false : { duration: 800, easing: "easeOutQuart" },
        layout: { padding: { right: 60 * U, left: 16 * U } },
        scales: {
          x: { beginAtZero: true, grid: { color: GRID, drawTicks: false }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 6, color: MUTED, font: { size: AXIS } } },
          y: { grid: { display: false }, border: { display: false }, afterFit: (s) => { s.width += 20 * U; }, ticks: { color: TEXT, font: { size: TICK, weight: "600" }, autoSkip: false, crossAlign: "far" } },
        },
        plugins: { vlabels: {} },
      },
      plugins: [valueLabels],
    };
  }
  function vbar(pairs, colors, axisTitle) {
    return {
      type: "bar",
      data: { labels: pairs.map((p) => p[0]), datasets: [{ data: pairs.map((p) => p[1]), backgroundColor: colors, borderRadius: 8 * U, borderSkipped: false, maxBarThickness: 150 * U }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: NOANIM ? false : { duration: 800, easing: "easeOutQuart" },
        layout: { padding: { top: 44 * U } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: TEXT, font: { size: Math.round(TICK * 1.5), weight: "700" } }, title: { display: !!axisTitle, text: axisTitle, color: MUTED, font: { size: AXIS } } },
          y: { beginAtZero: true, grid: { color: GRID, drawTicks: false }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 6, color: MUTED, font: { size: AXIS } } },
        },
        plugins: { vlabels: {} },
      },
      plugins: [valueLabels],
    };
  }

  /* ---------- DOM refs ---------- */
  const elTotal = document.getElementById("kpi-total");
  const elCountries = document.getElementById("kpi-countries");
  const elHope = document.getElementById("kpi-hope");
  const heroQ = document.getElementById("hero-q");
  const heroTitle = document.getElementById("hero-title");
  const heroSub = document.getElementById("hero-sub");
  const awaitEl = document.getElementById("await");
  const awaitSub = document.getElementById("await-sub");
  const canvas = document.getElementById("stage-canvas");
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("status-text");
  const dotsEl = document.getElementById("dots");
  const progressEl = document.getElementById("progress");
  const hintEl = document.getElementById("hint");

  PANELS.forEach((_, i) => { const d = document.createElement("span"); d.className = "s-dot"; dotsEl.appendChild(d); });
  const dots = [...dotsEl.children];

  /* ---------- count-up (writes the leading number, preserving any <small>) ---------- */
  function writeNum(el, str) {
    if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = str;
    else el.insertBefore(document.createTextNode(str), el.firstChild);
  }
  function countUp(el, target, decimals) {
    const fmt = (v) => (decimals ? v.toFixed(decimals) : Math.round(v).toString());
    if (NOANIM) return writeNum(el, fmt(target));
    const dur = 700, start = performance.now();
    (function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      writeNum(el, fmt(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------- state ---------- */
  let chart = null;
  let DATA = [];
  let idx = Math.max(0, Math.min(PANELS.length - 1, parseInt(params.get("panel") || "0", 10) || 0));
  let rotTimer = null;

  function renderPanel(i) {
    const panel = PANELS[i];
    heroQ.textContent = panel.q;
    heroTitle.textContent = panel.title;
    heroSub.textContent = DATA.length ? panel.sub(DATA) : "";
    dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
    if (chart) { chart.destroy(); chart = null; }
    if (!DATA.length) return;
    chart = new Chart(canvas, panel.build(DATA));
    restartProgress();
  }

  function restartProgress() {
    if (NOANIM) { progressEl.style.width = "12%"; return; }
    progressEl.style.transition = "none";
    progressEl.style.width = "0%";
    // force reflow then animate
    void progressEl.offsetWidth;
    progressEl.style.transition = "width " + DWELL_MS + "ms linear";
    progressEl.style.width = "100%";
  }

  function startRotation() {
    if (NOANIM) { renderPanel(idx); return; }   // hold on one panel for screenshots
    stopRotation();
    renderPanel(idx);
    rotTimer = setInterval(() => { idx = (idx + 1) % PANELS.length; renderPanel(idx); }, DWELL_MS);
  }
  function stopRotation() { if (rotTimer) { clearInterval(rotTimer); rotTimer = null; } }

  function showAwaiting(sub) {
    stopRotation();
    awaitEl.classList.remove("hidden");
    if (chart) { chart.destroy(); chart = null; }
    statusEl.classList.add("is-await");
    statusText.textContent = "Awaiting";
    hintEl.textContent = "Waiting for the first response";
    dotsEl.style.visibility = "hidden";
    progressEl.style.width = "0%";
    writeNum(elTotal, "0"); writeNum(elCountries, "0");
    if (elHope.firstChild && elHope.firstChild.nodeType === 3) elHope.firstChild.nodeValue = "0.0";
    if (sub) awaitSub.innerHTML = sub;
  }

  function showData(data) {
    DATA = data;
    awaitEl.classList.add("hidden");
    dotsEl.style.visibility = "visible";
    statusEl.classList.remove("is-await");
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    statusText.textContent = "Live · updated " + now;
    hintEl.textContent = "Auto-rotating · updates live";
    countUp(elTotal, data.length);
    countUp(elCountries, new Set(data.map((r) => (r.q1_country || "").trim()).filter(Boolean)).size);
    countUp(elHope, avg(data), 1);
    if (!rotTimer && !NOANIM) startRotation();
    else renderPanel(idx);   // refresh current panel with new data
  }

  /* ---------- live fetch + poll ---------- */
  const sheetUrl = E360Sheet.resolveUrl();
  async function refresh() {
    if (!sheetUrl) { showAwaiting("No Sheet connected yet. Set <code>SHEET_URL</code> in <code>js/sheet-data.js</code>."); return; }
    try {
      const data = await E360Sheet.fetchResponses(sheetUrl);
      if (!data.length) showAwaiting("The room appears here live as delegates submit the survey.");
      else showData(data);
    } catch (e) {
      console.warn("Stage live fetch failed:", e);
      showAwaiting("Connected — waiting for the first readable response.");
    }
  }

  /* ---------- resize (rebuild current chart with new font scale) ---------- */
  let rz = null;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { computeFonts(); if (DATA.length) renderPanel(idx); }, 200);
  });

  /* ---------- keyboard: F fullscreen, arrows to step ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
    if (e.key === "ArrowRight") { stopRotation(); idx = (idx + 1) % PANELS.length; renderPanel(idx); if (!NOANIM) startRotation(); }
    if (e.key === "ArrowLeft") { stopRotation(); idx = (idx - 1 + PANELS.length) % PANELS.length; renderPanel(idx); if (!NOANIM) startRotation(); }
  });

  /* ---------- boot ---------- */
  computeFonts();
  refresh();
  if (E360Sheet.POLL_SECONDS > 0) setInterval(refresh, E360Sheet.POLL_SECONDS * 1000);
})();
