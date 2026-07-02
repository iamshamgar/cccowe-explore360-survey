/* ============================================================================
   CCCOWE 2026 Explore360 — DEMO dashboard loader
   Loads data/sample-responses.json + merges any localStorage submissions,
   then hands the combined data to the shared chart engine (E360.render).
   For a live, Sheet-backed production board see dashboard-live.html.
   ============================================================================ */
(function () {
  "use strict";
  const cfg = EXPLORE360;

  async function loadData() {
    let sample = [];
    try {
      const res = await fetch("data/sample-responses.json", { cache: "no-store" });
      sample = await res.json();
    } catch (e) {
      console.warn("Could not load sample data:", e);
    }
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem(cfg.storageKey)) || [];
    } catch (_) {
      local = [];
    }
    return sample.concat(local);
  }

  async function refresh() {
    const data = await loadData();
    const board = document.getElementById("board");
    const empty = document.getElementById("empty");
    if (!data.length) {
      board.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }
    board.classList.remove("hidden");
    empty.classList.add("hidden");
    E360.render(data);
  }

  refresh();
  document.getElementById("refresh").addEventListener("click", refresh);
  document.getElementById("fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
})();
