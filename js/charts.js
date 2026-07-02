/* ============================================================================
   CCCOWE 2026 Explore360 — Shared chart engine
   Renders the KPI row + all charts for BOTH dashboards (demo + live).
   Consumes the internal response shape (option KEYS, not labels).
   Exposes: window.E360.render(data)
   ============================================================================ */
window.E360 = (function () {
  "use strict";

  const cfg = EXPLORE360;

  const css = getComputedStyle(document.documentElement);
  const C = (n) => css.getPropertyValue("--c" + n).trim();
  const PAL = [C(1), C(2), C(3), C(4), C(5), C(6), C(7), C(8)];
  const INK = css.getPropertyValue("--ink").trim();
  const TEAL = css.getPropertyValue("--teal").trim();
  const GOLD = css.getPropertyValue("--gold").trim();
  const ROSE = css.getPropertyValue("--rose").trim();
  const MUTED = css.getPropertyValue("--muted").trim();
  const LINE = css.getPropertyValue("--line").trim();

  const NOANIM =
    /[?&]noanim/.test(location.search) ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.font.size = 13;
  Chart.defaults.color = MUTED;
  Chart.defaults.animation.duration = NOANIM ? 0 : 700;
  Chart.defaults.animation.easing = "easeOutQuart";
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = INK;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: "600" };

  const charts = {};

  /* ---------- aggregation helpers ---------- */
  function countSingle(data, field, group) {
    const counts = {};
    group.order.forEach((k) => (counts[k] = 0));
    data.forEach((r) => {
      if (r[field] != null && counts.hasOwnProperty(r[field])) counts[r[field]]++;
    });
    return counts;
  }
  function countMulti(data, field, group) {
    const counts = {};
    group.order.forEach((k) => (counts[k] = 0));
    data.forEach((r) => {
      (r[field] || []).forEach((k) => {
        if (counts.hasOwnProperty(k)) counts[k]++;
      });
    });
    return counts;
  }
  function ranked(counts, group) {
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [group.labels[k], v]);
  }
  function ordered(counts, group) {
    return group.order.map((k) => [group.labels[k], counts[k]]);
  }

  /* ---------- chart builders ---------- */
  function hBar(id, pairs, color, opts = {}) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    const colors = Array.isArray(color) ? color : pairs.map(() => color);
    charts[id] = new Chart(ctx, {
      type: "bar",
      data: { labels: pairs.map((p) => p[0]), datasets: [{ data: pairs.map((p) => p[1]), backgroundColor: colors, borderRadius: 6, borderSkipped: false, maxBarThickness: 34 }] },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 16 } },
        scales: {
          x: { beginAtZero: true, grid: { color: LINE, drawTicks: false }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 6 } },
          y: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, font: { size: opts.labelSize || 12 } } },
        },
        plugins: { tooltip: { callbacks: { label: (c) => " " + c.parsed.x + " response" + (c.parsed.x === 1 ? "" : "s") } } },
      },
    });
  }

  function vBar(id, pairs, color) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
      type: "bar",
      data: { labels: pairs.map((p) => p[0]), datasets: [{ data: pairs.map((p) => p[1]), backgroundColor: color, borderRadius: 6, borderSkipped: false, maxBarThickness: 60 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: LINE, drawTicks: false }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 6 } },
        },
        plugins: { tooltip: { callbacks: { label: (c) => " " + c.parsed.y + " response" + (c.parsed.y === 1 ? "" : "s") } } },
      },
    });
  }

  function doughnut(id, pairs, colors) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
      type: "doughnut",
      data: { labels: pairs.map((p) => p[0]), datasets: [{ data: pairs.map((p) => p[1]), backgroundColor: colors, borderColor: "#fff", borderWidth: 2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "58%",
        plugins: {
          legend: { display: true, position: "right", labels: { boxWidth: 12, boxHeight: 12, padding: 10, font: { size: 12 } } },
          tooltip: { callbacks: { label: (c) => " " + c.label + ": " + c.parsed } },
        },
      },
    });
  }

  const avgLinePlugin = {
    id: "avgLine",
    afterDatasetsDraw(chart, _a, opts) {
      if (!opts || opts.value == null) return;
      const { ctx, chartArea: area, scales } = chart;
      const x = scales.x;
      const idx = opts.value - 1;
      const px = x.getPixelForValue(Math.floor(idx)) +
        (x.getPixelForValue(Math.min(4, Math.ceil(idx))) - x.getPixelForValue(Math.floor(idx))) * (idx - Math.floor(idx));
      ctx.save();
      ctx.strokeStyle = ROSE; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(px, area.top); ctx.lineTo(px, area.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ROSE; ctx.font = "600 12px Inter"; ctx.textAlign = "center";
      const label = "avg " + opts.value.toFixed(1);
      const w = ctx.measureText(label).width + 12;
      ctx.fillRect(px - w / 2, area.top - 20, w, 17);
      ctx.fillStyle = "#fff"; ctx.fillText(label, px, area.top - 8);
      ctx.restore();
    },
  };

  function hopeChart(id, counts, avg) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    const labels = ["1", "2", "3", "4", "5"];
    const data = labels.map((n) => counts[n] || 0);
    const grad = [ROSE, "#c07a4a", GOLD, "#5a9a6a", TEAL];
    charts[id] = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: grad, borderRadius: 6, borderSkipped: false, maxBarThickness: 54 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 24 } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, title: { display: true, text: "1 = not hopeful   ·   5 = extremely hopeful", color: MUTED, font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: LINE, drawTicks: false }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 6 } },
        },
        plugins: {
          avgLine: { value: avg },
          tooltip: { callbacks: { label: (c) => " " + c.parsed.y + " response" + (c.parsed.y === 1 ? "" : "s") } },
        },
      },
      plugins: [avgLinePlugin],
    });
  }

  /* ---------- count-up ---------- */
  function countUp(el, target, opts = {}) {
    const fmt = (v) => (opts.decimals ? v.toFixed(opts.decimals) : Math.round(v).toString());
    const set = (v) => (el.childNodes[0] ? (el.childNodes[0].nodeValue = fmt(v)) : (el.textContent = fmt(v)));
    if (NOANIM) return set(target);
    const dur = 650, start = performance.now();
    (function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      set(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------- main render ---------- */
  function render(data) {
    const countries = new Set(data.map((r) => (r.q1_country || "").trim()).filter(Boolean));
    const hopeVals = data.map((r) => r.q9_hope).filter((v) => typeof v === "number");
    const avgHope = hopeVals.length ? hopeVals.reduce((a, b) => a + b, 0) / hopeVals.length : 0;

    countUp(document.getElementById("kpi-total"), data.length);
    countUp(document.getElementById("kpi-countries"), countries.size);
    countUp(document.getElementById("kpi-hope"), avgHope, { decimals: 1 });

    const cc = {};
    data.forEach((r) => { const k = (r.q1_country || "").trim(); if (k) cc[k] = (cc[k] || 0) + 1; });
    hBar("c-q1", Object.entries(cc).sort((a, b) => b[1] - a[1]), TEAL);

    doughnut("c-q3", ordered(countSingle(data, "q3_role", cfg.q3_role), cfg.q3_role).filter((p) => p[1] > 0), PAL);
    vBar("c-q4", ordered(countSingle(data, "q4_languages", cfg.q4_languages), cfg.q4_languages), C(2));
    hBar("c-q5", ranked(countMulti(data, "q5_communities", cfg.q5_communities), cfg.q5_communities), C(4));
    hBar("c-q6", ordered(countSingle(data, "q6_relative_size", cfg.q6_relative_size), cfg.q6_relative_size).filter((p) => p[1] > 0), C(3));
    hBar("c-q7", ranked(countSingle(data, "q7_youth", cfg.q7_youth), cfg.q7_youth), C(8));

    const q8 = ranked(countMulti(data, "q8_tensions", cfg.q8_tensions), cfg.q8_tensions);
    hBar("c-q8", q8, q8.map((_, i) => (i === 0 ? ROSE : i === 1 ? "#c56a78" : "#cf8f99")), { labelSize: 12.5 });

    const hc = {}; [1, 2, 3, 4, 5].forEach((n) => (hc[n] = 0));
    hopeVals.forEach((v) => (hc[v] = (hc[v] || 0) + 1));
    hopeChart("c-q9", hc, avgHope);
    const q9sub = document.getElementById("q9-sub");
    if (q9sub) q9sub.textContent = "Q9 · average " + avgHope.toFixed(1) + " of 5";

    hBar("c-q10", ranked(countMulti(data, "q10_hope_sources", cfg.q10_hope_sources), cfg.q10_hope_sources), C(5));

    const upd = document.getElementById("updated");
    if (upd) {
      upd.textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " · " + data.length + " response" + (data.length === 1 ? "" : "s");
    }
  }

  return { render };
})();
