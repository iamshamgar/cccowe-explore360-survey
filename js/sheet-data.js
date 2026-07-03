/* ============================================================================
   CCCOWE 2026 Explore360 — Shared Google Sheet data pipeline
   Used by BOTH the analytical board (dashboard-live.js) and the projector /
   stage view (stage.js). Fetches the live Sheet, maps verbatim question-title
   columns + answer text back to internal option keys, and returns response
   objects in the standard shape the chart engine consumes.

   >>> THE ONE PLACE TO SET THE LIVE SHEET <<<
   Paste the published Sheet URL into SHEET_URL below. Supported forms:
     • gviz JSON  : https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:json&sheet=Form%20Responses%201
     • Published CSV: File → Share → Publish to web → (sheet) → CSV  (…/pub?…&output=csv)
   You can also test any URL without editing this file by appending ?sheet=<URL>
   to the page URL (works on dashboard-live.html and stage.html).
   ============================================================================ */
window.E360Sheet = (function () {
  "use strict";

  const SHEET_URL = "https://docs.google.com/spreadsheets/d/1CmJpS6kpBaVqfuYAPZfl9K0Mf-jKuP52JGNDhoC4i8g/gviz/tq?tqx=out:json&sheet=Form%20Responses%201"; // live CCCOWE Explore360 response Sheet (gviz feed)
  const POLL_SECONDS = 20; // auto-refresh interval while a live board is open

  const norm = (s) => (s || "").toString().toLowerCase().replace(/[\s ]+/g, " ").trim();

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
    if (!rules) return null;
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
        else resp[field] = mapAnswer(field, raw); // q3, q6, q7 single-select
      });
      if ((resp.q1_country && resp.q1_country.length) || typeof resp.q9_hope === "number") out.push(resp);
    }
    return out;
  }

  /* ---------- fetch + parse ---------- */
  async function fetchResponses(url) {
    const bust = (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
    const res = await fetch(url + bust, { cache: "no-store" });
    const text = await res.text();
    const isGviz = (/gviz\/tq/.test(url) && /out:?json/i.test(url)) || /google\.visualization/.test(text);
    const rows = isGviz ? parseGviz(text) : parseCSV(text);
    return rowsToResponses(rows);
  }

  /* resolve the active URL: ?sheet= override wins, else SHEET_URL */
  function resolveUrl() {
    const p = new URLSearchParams(location.search).get("sheet");
    return (p || SHEET_URL || "").trim();
  }

  return { SHEET_URL, POLL_SECONDS, fetchResponses, rowsToResponses, resolveUrl };
})();
