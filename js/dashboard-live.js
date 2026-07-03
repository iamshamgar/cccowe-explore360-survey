/* ============================================================================
   CCCOWE 2026 Explore360 — LIVE analytical dashboard loader
   Reads real responses from the live Google Sheet via the shared pipeline
   (js/sheet-data.js) and renders the full analytical grid. NO sample data.
   Until the first row arrives it shows a polished "Awaiting responses" state.

   Looking for the projector / big-screen view? Open stage.html.
   The Sheet URL + poll interval live in js/sheet-data.js (SHEET_URL).
   ============================================================================ */
(function () {
  "use strict";

  const app = document.getElementById("app");
  const awaiting = document.getElementById("awaiting");
  const modeFlag = document.getElementById("mode-flag");
  const sheetUrl = E360Sheet.resolveUrl();

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

  async function refresh() {
    if (!sheetUrl) {
      modeFlag.textContent = "Live · not yet connected";
      showAwaiting(
        "<strong>Awaiting connection.</strong> No Sheet URL is configured yet. " +
        "Set <code>SHEET_URL</code> in <code>js/sheet-data.js</code> and responses will stream in here automatically."
      );
      return;
    }
    modeFlag.textContent = "Live";
    try {
      const data = await E360Sheet.fetchResponses(sheetUrl);
      if (!data.length) showAwaiting();
      else showData(data);
    } catch (e) {
      console.warn("Live fetch failed:", e);
      showAwaiting(
        "<strong>Awaiting responses.</strong> Connected, but no readable rows yet " +
        "(or the Sheet is still publishing). The board will populate automatically as responses arrive."
      );
    }
  }

  refresh();
  if (E360Sheet.POLL_SECONDS > 0) setInterval(refresh, E360Sheet.POLL_SECONDS * 1000);

  document.getElementById("refresh").addEventListener("click", refresh);
  document.getElementById("fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
})();
