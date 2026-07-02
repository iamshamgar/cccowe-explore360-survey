/* ============================================================================
   CCCOWE 2026 Explore360 — LIVE (production) dashboard loader
   Reads real responses from a published Google Sheet (the Google Form → Sheet
   backend Koda is building). NO sample data. Until the first row arrives it
   shows a polished "Awaiting responses" skeleton state.

   >>> ONE-LINE SWAP WHEN THE SHEET IS READY <<<
   Paste the published Sheet URL below. Supported forms:
     • Published CSV :  File → Share → Publish to web → (sheet) → CSV
                        e.g. https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv
     • gviz JSON     :  https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:json&sheet=Form%20Responses%201
   You can also test without editing this file by appending ?sheet=<URL> to the page URL.
   ============================================================================ */

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1CmJpS6kpBaVqfuYAPZfl9K0Mf-jKuP52JGNDhoC4i8g/gviz/tq?tqx=out:json&sheet=Form%20Responses%201";  // live CCCOWE Explore360 response Sheet (gviz feed)
const POLL_SECONDS = 20;       // auto-refresh interval while the board is open

/* ============================================================================ */
(function () {
  "use strict";

  const app = document.getElementById("app");
  const awaiting = document.getElementById("awaiting");
  const modeFlag = document.getElementById("mode-flag");

  // allow ?sheet=<url> override for testing without editing the constant
  const params = new URLSearchParams(location.search);
  const sheetUrl = (params.get("sheet") || SHEET_URL || "").trim();

  /* ---------- normalize helper ---------- */
  const norm = (s) => (s || "").toString().toLowerCase().replace(/[\s ]+/g, " ").trim();

  /* ---------- column header → internal field ---------- */
  function detectField(header) {
    const h = norm(header);
    if (h.includes("timestamp")) return "_ts";
    if (h.includes("country")) return "q1_country";
    if (h.includes("church name") || h.includes("name and city")) return "q2_church";
    if (h.includes("your role") || (h.includes("role") && h.includes("church"))) return "q3_role";
    if (h.includes("how many languages") || (h.includes("languages") && h.includes("used"))) return "q4_languages";
    if (h.includes("communities")) return "q5_communities";
    if (h.includes("how large") || (h.includes("relative") && h.includes("congregation"))) return "q6_relative_size";
    if (h.includes("reach adulthood") || h.includes("grow up in your church")) return "q7_youth";
    if (h.includes("most pressing tension")) return "q8_tensions";
    if (h.includes("how hopeful")) return "q9_hope";
    if (h.includes("most hope") || h.includes("gives you the most hope")) return "q10_hope_sources";
    return null;
  }

  /* ---------- answer text → internal key (keyword matchers) ---------- */
  const MATCHERS = {
    q3_role: [
      ["senior_pastor", ["senior", "lead pastor"]],
      ["local_lang_pastor", ["english ministry", "local-language", "local language"]],
      ["associate_pastor", ["associate", "assistant"]],
      ["youth_pastor", ["youth", "young adults"]],
      ["lay_leader", ["lay leader", "elder", "deacon"]],
      ["staff", ["staff"]],
      ["other", ["other"]],
    ],
    q5_communities: [
      ["long_established", ["long-established", "multi-generational"]],
      ["recent_hk", ["recent hong kong", "bno"]],
      ["cantonese", ["cantonese", "hong kong-origin"]],
      ["mandarin", ["mandarin"]],
      ["taiwan", ["taiwan"]],
      ["sea_diaspora", ["southeast asian"]],
      ["local_born", ["locally born"]],
      ["other", ["other"]],
    ],
    q6_relative_size: [
      ["single_language", ["single-language", "single language"]],
      ["sig_smaller", ["significantly smaller"]],
      ["somewhat_smaller", ["somewhat smaller"]],
      ["about_same", ["about the same"]],
      ["somewhat_larger", ["somewhat larger"]],
      ["sig_larger", ["significantly larger"]],
    ],
    q7_youth: [
      ["stay_heritage", ["remain part", "most stay", "heritage church"]],
      ["move_local", ["non-chinese", "local church"]],
      ["step_away", ["step away"]],
      ["mix", ["mix"]],
      ["dont_know", ["don't know", "dont know", "don't track", "dont track"]],
    ],
    q8_tensions: [
      ["language_gap", ["language gap"]],
      ["next_gen", ["retaining and discipling", "next generation"]],
      ["integrating", ["integrating"]],
      ["limited_staff", ["limited pastoral", "organizational structure", "resources"]],
      ["financial", ["financial", "facility"]],
      ["political", ["political or cultural"]],
      ["leaving", ["members leaving", "leaving for other"]],
      ["grief", ["grief"]],
      ["leaders", ["raising up", "empowering new leaders"]],
      ["other", ["other"]],
    ],
    q10_hope_sources: [
      ["next_gen_leaders", ["next-generation leaders", "stepping into roles"]],
      ["new_arrivals", ["new arrivals"]],
      ["discipleship", ["deeper discipleship"]],
      ["cross_region", ["growing connection", "across regions"]],
      ["new_models", ["new models"]],
      ["renewed_calling", ["renewed sense of calling", "renewed sense"]],
      ["reclaiming", ["reclaiming"]],
      ["theology", ["theological richness"]],
      ["other", ["other"]],
    ],
  };

  function mapAnswer(field, text) {
    const t = norm(text);
    if (!t) return null;
    const rules = MATCHERS[field];
    for (const [key, kws] of rules) {
      if (kws.some((k) => t.includes(k))) return key;
    }
    return null;
  }
  function mapMulti(field, cell) {
    if (!cell) return [];
    return cell
      .split(",")
      .map((s) => mapAnswer(field, s))
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
  }

  /* ---------- CSV parser (handles quoted fields w/ embedded commas & newlines) ---------- */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (inQ) {
        if (c === '"' && n === '"') { field += '"'; i++; }
        else if (c === '"') inQ = false;
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\r") { /* skip */ }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c && c.trim() !== ""));
  }

  /* ---------- gviz JSON parser ---------- */
  function parseGviz(text) {
    const json = JSON.parse(text.replace(/^[^{]*\(/, "").replace(/\);?\s*$/, ""));
    const cols = json.table.cols.map((c) => c.label || "");
    const rows = json.table.rows.map((r) => (r.c || []).map((cell) => (cell && cell.v != null ? cell.v : "")));
    return [cols].concat(rows);
  }

  /* ---------- rows[][] (first row = headers) -> internal response objects ---------- */
  function rowsToResponses(rows) {
    if (!rows.length) return [];
    const headers = rows[0];
    const fieldByCol = headers.map(detectField);
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const resp = { id: "sheet-" + i, source: "live" };
      fieldByCol.forEach((field, idx) => {
        if (!field) return;
        const raw = (cells[idx] != null ? cells[idx] : "").toString().trim();
        if (field === "_ts") resp.timestamp = raw;
        else if (field === "q1_country") resp.q1_country = raw;
        else if (field === "q2_church") resp.q2_church = raw;
        else if (field === "q9_hope") { const m = raw.match(/[1-5]/); resp.q9_hope = m ? Number(m[0]) : null; }
        else if (field === "q4_languages") { resp.q4_languages = /4/.test(raw) ? "4plus" : (raw.match(/[123]/) || [null])[0]; }
        else if (field === "q5_communities") resp.q5_communities = mapMulti(field, raw);
        else if (field === "q10_hope_sources") resp.q10_hope_sources = mapMulti(field, raw);
        else if (field === "q8_tensions") resp.q8_tensions = mapMulti(field, raw).slice(0, 3); // cap 3
        else resp[field] = mapAnswer(field, raw); // q3, q4, q6, q7 single-select
      });
      // require at least a country or a hope value to count as a real row
      if ((resp.q1_country && resp.q1_country.length) || typeof resp.q9_hope === "number") out.push(resp);
    }
    return out;
  }

  /* ---------- fetch + parse ---------- */
  async function fetchResponses(url) {
    const bust = (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
    const res = await fetch(url + bust, { cache: "no-store" });
    const text = await res.text();
    const isGviz = /gviz\/tq/.test(url) && /out:?json/i.test(url) || /google\.visualization/.test(text);
    const rows = isGviz ? parseGviz(text) : parseCSV(text);
    return rowsToResponses(rows);
  }

  /* ---------- UI states ---------- */
  function showAwaiting(msg) {
    app.classList.remove("is-live-ready");
    awaiting.classList.remove("hidden");
    if (msg) awaiting.querySelector("span:last-child").innerHTML = msg;
    document.getElementById("updated").textContent = "";
  }
  function showData(data) {
    app.classList.add("is-live-ready");
    awaiting.classList.add("hidden");
    E360.render(data);
  }

  /* ---------- main ---------- */
  let timer = null;
  async function refresh() {
    if (!sheetUrl) {
      modeFlag.textContent = "Live · not yet connected";
      showAwaiting(
        "<strong>Awaiting connection.</strong> No Sheet URL is configured yet. " +
        "Once Koda's Google Form &rarr; Sheet backend is live, paste its published URL into " +
        "<code>SHEET_URL</code> in <code>js/dashboard-live.js</code> and responses will stream in here automatically."
      );
      return;
    }
    modeFlag.textContent = "Live";
    try {
      const data = await fetchResponses(sheetUrl);
      if (!data.length) {
        showAwaiting();
      } else {
        showData(data);
      }
    } catch (e) {
      console.warn("Live fetch failed:", e);
      showAwaiting(
        "<strong>Awaiting responses.</strong> Connected, but no readable rows yet " +
        "(or the Sheet is still publishing). The board will populate automatically as responses arrive."
      );
    }
  }

  refresh();
  if (POLL_SECONDS > 0) timer = setInterval(refresh, POLL_SECONDS * 1000);

  document.getElementById("refresh").addEventListener("click", refresh);
  document.getElementById("fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
})();
