# CCCOWE 2026 Explore360 — Survey + Live Dashboard (Prototype)

An interactive web prototype for the **Explore360 breakout** — *"The Evolving Chinese
Church Around the Globe"* (CCCOWE 2026, Kuching, Malaysia, July 21–22, 2026).

Four static pages:

| Page | Purpose |
|------|---------|
| `index.html` | The 10-question in-session delegate survey. Submissions save to the browser's `localStorage`. |
| `dashboard.html` | **Demo dashboard** — preloaded with ~40 realistic sample responses (plus any local submissions) so it looks real for a team demo. |
| `dashboard-live.html` | **Live analytical dashboard** — full 10-chart grid, **no sample data**. Reads real responses from the published Google Sheet. Until the first row arrives it shows a polished "Awaiting responses" skeleton state. Best for close-up / laptop viewing. |
| `stage.html` | **Projector / big-screen view — open this one in the room.** Dark "stage" theme, giant KPI numbers, and one large hero chart that **auto-rotates** through the key visuals (Q8 tensions first). Reads the same live Sheet. Designed to read from 50+ ft. |

> **This is a prototype.** It demonstrates the concept end-to-end (fill the survey → see it on
> the dashboard) with **no server or backend**. Responses are stored in the browser only. See
> [Going to production](#going-to-production) to swap the `localStorage` stub for a real backend.
> This is the more-polished, fully-custom alternative to the separate Google Forms build.

---

## What it does

- Reproduces all 10 Explore360 questions faithfully, with the exact configured input types
  (short answer, single-select, checkboxes, 1–5 scale). **Q8 enforces a max of 3 selections
  in the UI.** Q7 is intentionally de-labeled and framed descriptively around next-generation
  retention (no loaded label).
- On submit, saves the response to `localStorage` and shows a thank-you state.
- The dashboard loads ~40 realistic sample responses from `data/sample-responses.json` **and
  merges any live `localStorage` submissions**, so a demo works: fill the survey, open the
  dashboard, and your response is reflected in the totals and charts.
- Charts: headline KPI row (total responses, countries represented, average hope), plus
  Q1 countries, Q3 roles, Q4 languages, Q5 communities, Q6 relative size, Q7 youth outcomes,
  **Q8 most-pressing tensions (the centerpiece ranked bar)**, Q9 hope distribution with an
  average marker, and Q10 sources of hope.

---

## Preview locally

No build step. Serve the folder as static files (needed so the dashboard can `fetch` the JSON):

```bash
cd "survey-app"
python3 -m http.server 8360
```

Then open:

- Survey: <http://localhost:8360/index.html>
- Demo dashboard: <http://localhost:8360/dashboard.html>
- Live analytical dashboard: <http://localhost:8360/dashboard-live.html>
- **Projector view: <http://localhost:8360/stage.html>** (press **F** for full screen)

**Demo flow:** open the survey → fill it in (Q8 caps at 3) → **Submit** → open the dashboard →
your response is now counted. To reset the demo, clear the site's `localStorage`
(DevTools → Application → Local Storage → delete the `cccowe-explore360-responses` key), or run
`localStorage.clear()` in the console.

> Opening the files directly with `file://` will show the survey but the dashboard's `fetch`
> of the sample JSON may be blocked by the browser. Always use a local server.

---

## Deploy to GitHub Pages

This is a plain static site — GitHub Pages serves it as-is.

1. Create a repo and push the **contents of this `survey-app/` folder** to the repo root
   (so `index.html` sits at the top level).
2. In the repo: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
   branch `main`, folder `/ (root)`.
3. Save. Your site publishes at `https://<user>.github.io/<repo>/`.
   - Survey: `.../index.html`  ·  Dashboard: `.../dashboard.html`

No Jekyll or Actions config needed. (Optional: add an empty `.nojekyll` file if you ever add
folders beginning with an underscore.)

---

## The projector view (`stage.html`) — for the room

This is the screen to put on the projector during the session. It is built for legibility from
**50+ feet**, not for analysis:

- **Dark "stage" theme** — deep navy background with bright teal / gold / rose bars for maximum
  projector contrast in a dimmed room.
- **A persistent header** with the session title and a **giant KPI band** (Responses, Countries,
  Average hope) that is always on screen.
- **One big hero chart at a time**, full-bleed, with a large title so the room always knows what
  it's looking at. It **auto-rotates every ~13 seconds** through the key visuals in this order:
  **Q8 most-pressing tensions (lead)** → Q9 hope distribution → Q1 countries → Q5 communities →
  Q7 next-generation outcomes → Q10 sources of hope. Progress dots + a fill bar show the cadence.
- **Live** — polls the same Sheet every 20s; new responses update the KPIs and the current chart
  in place. Before any responses arrive it shows a calm "Awaiting responses" state (no broken UI).
- Type scales with the viewport, so it fills **1920×1080** and looks even bigger on 4K projectors.

**Running it in the room:**
1. Open `stage.html`, press **F** (or the browser's full-screen) for a clean kiosk with no chrome.
2. It rotates on its own. Optional manual control: **← / →** step between panels; **F** toggles
   full screen.
3. URL flags for setup/testing: `?panel=0` start on a specific panel · `?noanim=1` freeze for a
   photo · `?sheet=<url>` point at any Sheet/CSV.

The analytical `dashboard-live.html` (10-chart grid) is preserved for close-up viewing; each page
links to the projector view.

## The live dashboard (`dashboard-live.html`)

This is the real-event board. It carries **no sample data** — it reads directly from Koda's
published Google Sheet (fed by a Google Form). Two states:

- **Awaiting responses** — when no Sheet is connected (or zero rows yet): the chart frames render
  as animated skeletons under an "Awaiting responses" banner. Nothing looks broken.
- **Live** — as rows arrive it auto-populates (polls every `POLL_SECONDS`, default 20s).

**One-line connection when Koda's Sheet is ready** — edit the top of `js/sheet-data.js` (this one
file feeds **both** the analytical board and the projector view):

```js
const SHEET_URL = "";   // <-- paste the published Sheet URL here
```

Supported URL forms:
- **Published CSV** (recommended): in the Sheet, *File → Share → Publish to web → (the responses
  tab) → CSV*. Copy the `…/pub?…&output=csv` URL. CORS-open and fetchable from GitHub Pages.
- **gviz JSON**: `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:json&sheet=Form%20Responses%201`

No code edit needed to test a URL: append `?sheet=<published-url>` to the page
(e.g. `dashboard-live.html?sheet=https://…output=csv`).

**How columns are mapped.** The parser matches the Sheet's header row by the verbatim question
titles from `../cccowe-explore360-survey-questions.md` (a leading `Timestamp` column is expected),
using resilient keyword matching so minor punctuation differences don't break it. Checkbox
questions (Q5, Q8, Q10) arrive as a single comma-separated cell and are split on the comma; Q8 is
capped at the first 3 selections per row. Answer text is mapped back to internal option keys.

**Column contract for Koda:** `fixtures/live-test.csv` is a 3-row example with the **exact
expected header row** and verbatim answer text. It is *not* live data and is never loaded by
default — it exists as the schema reference and as the fixture the parser was tested against
(load it with `dashboard-live.html?sheet=fixtures/live-test.csv`).

## Going to production

The only thing that needs to change is the survey submit handler in `js/survey.js` (and the
dashboard's data source). Two low-friction options that keep the site fully static:

### Option A — Google Sheets via Apps Script (recommended for a live event)
1. Create a Google Sheet with one column per question.
2. **Extensions → Apps Script**, add a `doPost(e)` that appends the JSON body as a row; deploy
   as a Web App ("Anyone" can access).
3. In `survey.js`, after building `response`, `fetch(WEBAPP_URL, { method: "POST", body: JSON.stringify(response) })`.
4. For the dashboard, publish the sheet as CSV (or a `doGet` returning JSON) and point
   `loadData()` at it instead of / in addition to the sample file.
- **Pros:** free, no accounts for delegates, non-technical staff can watch rows land live.

### Option B — Formspree (fastest to wire up)
1. Create a Formspree form; point the survey `fetch` at your Formspree endpoint.
2. Read responses back via Formspree's API or export.
- **Pros:** zero backend code. **Cons:** the free tier's read-back/polling for a live dashboard
  is more limited than Sheets.

Either way, keep `data/sample-responses.json` as a fallback / seed so the dashboard never
renders empty on stage.

---

## Data format contract (JSON shape from any backend)

Each response is one object. `dashboard.js` and the sample file both use this shape:

```json
{
  "id": "s-001",
  "timestamp": "2026-07-21T09:15:43Z",
  "source": "sample | live",
  "q1_country": "United Kingdom",
  "q2_church": "London Chinese Church — London",
  "q3_role": "senior_pastor",
  "q4_languages": "3",
  "q5_communities": ["long_established", "local_born"],
  "q6_relative_size": "somewhat_smaller",
  "q7_youth": "mix",
  "q8_tensions": ["language_gap", "next_gen", "leaders"],
  "q9_hope": 4,
  "q10_hope_sources": ["next_gen_leaders", "discipleship"]
}
```

Option **keys** (not display labels) are the source of truth and are defined once in
`js/questions.js` (the `EXPLORE360` object), shared by the survey and the dashboard. Valid keys:

- `q3_role`: `senior_pastor · local_lang_pastor · associate_pastor · youth_pastor · lay_leader · staff · other`
- `q4_languages`: `1 · 2 · 3 · 4plus`
- `q5_communities`: `long_established · cantonese · mandarin · recent_hk · taiwan · sea_diaspora · local_born · other`
- `q6_relative_size`: `sig_smaller · somewhat_smaller · about_same · somewhat_larger · sig_larger · single_language`
- `q7_youth`: `stay_heritage · move_local · step_away · mix · dont_know`
- `q8_tensions` (max 3): `language_gap · next_gen · integrating · limited_staff · financial · political · leaving · grief · leaders · other`
- `q9_hope`: integer `1`–`5`
- `q10_hope_sources`: `next_gen_leaders · new_arrivals · discipleship · cross_region · new_models · renewed_calling · reclaiming · theology · other`

---

## Files

```
survey-app/
├── index.html                 # survey form (10 questions)
├── dashboard.html             # DEMO dashboard (preloaded sample data)
├── dashboard-live.html        # LIVE analytical dashboard (10-chart grid, Sheet)
├── stage.html                 # PROJECTOR view (dark, giant, auto-rotating)
├── css/styles.css             # shared design tokens + light-theme styles
├── css/stage.css              # dark projector/stage theme
├── js/questions.js            # shared question config (keys ↔ labels) — source of truth
├── js/sheet-data.js           # SHEET_URL + Sheet fetch/parse pipeline (live board + stage)
├── js/survey.js               # form rendering, Q8 max-3, localStorage save
├── js/charts.js               # shared chart engine (demo + analytical dashboards)
├── js/dashboard.js            # demo loader: sample JSON + localStorage merge
├── js/dashboard-live.js       # analytical live loader (uses sheet-data.js)
├── js/stage.js                # projector engine: KPIs + auto-rotating hero chart
├── data/sample-responses.json # ~40 realistic sample responses (demo board only)
├── data/_generate_sample.py   # (dev only) regenerates the sample JSON
├── fixtures/live-test.csv      # Sheet column contract / parser test fixture (not live data)
└── README.md
```

## Design notes

- **Charting:** Chart.js 4.4.1 via jsDelivr CDN (no build step). Custom theme — no library defaults.
- **Typography:** *Source Serif 4* for the banner/display, *Inter* for UI and numerics
  (tabular figures for KPIs). Both from Google Fonts.
- **Palette:** restrained conference "navy + teal + warm gold," with rose reserved for the
  tensions (Q8) and the hope-average marker. Light background reads well on a projector. This
  can be re-aligned to the print-handout palette later by editing the CSS custom properties at
  the top of `css/styles.css`.
