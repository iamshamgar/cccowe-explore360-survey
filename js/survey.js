/* ============================================================================
   CCCOWE 2026 Explore360 — Survey form logic
   Renders choice options from EXPLORE360 config, enforces Q8 max-3,
   validates, and stores responses to localStorage (prototype backend).
   ============================================================================ */
(function () {
  "use strict";

  const cfg = EXPLORE360;

  /* ---- render radio (single-select) option groups ---- */
  function renderSingle(containerId, group, name) {
    const el = document.getElementById(containerId);
    group.order.forEach((key) => {
      const label = document.createElement("label");
      label.className = "opt";
      label.innerHTML =
        '<input type="radio" name="' + name + '" value="' + key + '">' +
        "<span>" + group.labels[key] + "</span>";
      el.appendChild(label);
    });
  }

  /* ---- render checkbox (multi-select) option groups ---- */
  function renderMulti(containerId, group, name) {
    const el = document.getElementById(containerId);
    group.order.forEach((key) => {
      const label = document.createElement("label");
      label.className = "opt";
      label.innerHTML =
        '<input type="checkbox" name="' + name + '" value="' + key + '">' +
        "<span>" + group.labels[key] + "</span>";
      el.appendChild(label);
    });
  }

  /* ---- render 1–5 linear scale ---- */
  function renderScale(containerId, group, name) {
    const el = document.getElementById(containerId);
    for (let i = group.min; i <= group.max; i++) {
      const label = document.createElement("label");
      label.className = "scale__opt";
      label.innerHTML =
        '<input type="radio" name="' + name + '" value="' + i + '">' +
        '<span class="scale__num">' + i + "</span>";
      el.appendChild(label);
    }
  }

  renderSingle("q3-opts", cfg.q3_role, "q3_role");
  renderSingle("q4-opts", cfg.q4_languages, "q4_languages");
  renderMulti("q5-opts", cfg.q5_communities, "q5_communities");
  renderSingle("q6-opts", cfg.q6_relative_size, "q6_relative_size");
  renderSingle("q7-opts", cfg.q7_youth, "q7_youth");
  renderMulti("q8-opts", cfg.q8_tensions, "q8_tensions");
  renderScale("q9-scale", cfg.q9_hope, "q9_hope");
  renderMulti("q10-opts", cfg.q10_hope_sources, "q10_hope_sources");

  /* ---- visual checked-state toggling ---- */
  document.querySelectorAll(".opt input").forEach((input) => {
    input.addEventListener("change", () => {
      const groupName = input.name;
      if (input.type === "radio") {
        document
          .querySelectorAll('input[name="' + groupName + '"]')
          .forEach((r) => r.closest(".opt").classList.toggle("is-checked", r.checked));
      } else {
        input.closest(".opt").classList.toggle("is-checked", input.checked);
      }
    });
  });
  document.querySelectorAll(".scale__opt input").forEach((input) => {
    input.addEventListener("change", () => {
      document
        .querySelectorAll('input[name="' + input.name + '"]')
        .forEach((r) => r.closest(".scale__opt").classList.toggle("is-checked", r.checked));
    });
  });

  /* ---- Q8: enforce max 3 selections ---- */
  const MAX_TENSIONS = 3;
  const q8Inputs = () => document.querySelectorAll('input[name="q8_tensions"]');
  const capNote = document.getElementById("q8-cap");

  function updateQ8Cap() {
    const checked = [...q8Inputs()].filter((i) => i.checked);
    const atMax = checked.length >= MAX_TENSIONS;
    q8Inputs().forEach((i) => {
      const disable = atMax && !i.checked;
      i.disabled = disable;
      i.closest(".opt").classList.toggle("is-disabled", disable);
    });
    capNote.textContent = checked.length + " of " + MAX_TENSIONS + " selected";
    capNote.classList.toggle("is-max", atMax);
  }
  q8Inputs().forEach((i) => i.addEventListener("change", updateQ8Cap));

  /* ---- helpers ---- */
  function val(name) {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }
  function vals(name) {
    return [...document.querySelectorAll('input[name="' + name + '"]:checked')].map((e) => e.value);
  }

  /* ---- submit ---- */
  const form = document.getElementById("survey");
  const errEl = document.getElementById("form-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errEl.textContent = "";

    const country = document.getElementById("q1").value.trim();
    const response = {
      id: "r-" + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      source: "live",
      q1_country: country,
      q2_church: document.getElementById("q2").value.trim(),
      q3_role: val("q3_role"),
      q4_languages: val("q4_languages"),
      q5_communities: vals("q5_communities"),
      q6_relative_size: val("q6_relative_size"),
      q7_youth: val("q7_youth"),
      q8_tensions: vals("q8_tensions"),
      q9_hope: val("q9_hope") ? Number(val("q9_hope")) : null,
      q10_hope_sources: vals("q10_hope_sources"),
    };

    // light validation — country + hope are the anchors the dashboard needs
    if (!response.q1_country) {
      errEl.textContent = "Please tell us what country your church is in (Q1).";
      document.getElementById("q1").focus();
      return;
    }
    if (!response.q9_hope) {
      errEl.textContent = "Please answer the hope scale (Q9) before submitting.";
      return;
    }

    // persist to localStorage (prototype backend)
    let store = [];
    try {
      store = JSON.parse(localStorage.getItem(cfg.storageKey)) || [];
    } catch (_) {
      store = [];
    }
    store.push(response);
    localStorage.setItem(cfg.storageKey, JSON.stringify(store));

    // show thank-you
    form.classList.add("hidden");
    document.getElementById("thanks").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---- submit another ---- */
  document.getElementById("again").addEventListener("click", () => {
    form.reset();
    document.querySelectorAll(".is-checked").forEach((el) => el.classList.remove("is-checked"));
    document.querySelectorAll(".is-disabled").forEach((el) => el.classList.remove("is-disabled"));
    q8Inputs().forEach((i) => (i.disabled = false));
    updateQ8Cap();
    document.getElementById("thanks").classList.add("hidden");
    form.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  updateQ8Cap();
})();
