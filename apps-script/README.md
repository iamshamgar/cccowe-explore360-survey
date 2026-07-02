# CCCOWE Explore360 — Apps Script Form Builder

`build-survey-form.gs` generates the complete 10-question Explore360 survey as a
Google Form and links a Google Sheet as the response backend. Run it once.

## Paste and run

1. Open <https://script.google.com> and click **New project**.
2. Delete the empty `myFunction()` stub and paste the entire contents of
   `build-survey-form.gs`.
3. In the function picker, select **`buildSurvey`** and click **Run**.
4. Authorize the scopes when prompted (Forms, Sheets, Drive). It will warn
   "unsafe" because the script is your own unpublished code — click through
   Advanced → Go to project → Allow. Run again if the first run stopped at auth.
5. Open **View → Logs** (Execution log). It prints three URLs:
   - **Form edit URL** — edit the form/questions.
   - **Form response URL** — the public link you share with delegates.
   - **Response Sheet URL** — the linked Google Sheet the dashboard reads.
   It also prints a ready-made `gviz` feed URL for the dashboard.

## The one manual step (publish to web)

Apps Script sets the Sheet to "anyone with the link can view," but it **cannot**
toggle classic Publish-to-web. Do this once by hand so a static dashboard can
read the data:

- Open the **Response Sheet URL** → **File → Share → Publish to web** →
  choose the whole document (or the `Form Responses 1` tab) → **Publish**.

After publishing, the dashboard can read the data via any of:
- gviz JSON: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&sheet=Form%20Responses%201`
- CSV export: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>`
- The `/pub?output=csv` URL that Publish-to-web hands you.

`<SHEET_ID>` is the long id in the Response Sheet URL.

## Dashboard config

Set the dashboard's **`SHEET_URL`** config value to the **published Sheet URL**
(or the gviz/CSV endpoint above) — **not** the Form URL. The Sheet's column
headers are the verbatim question titles plus a leading `Timestamp` column; the
dashboard maps columns by those exact title strings, so do not rename questions.

## Notes

- All questions are `required`. Flip any `.setRequired(true)` to `false` to make
  it optional.
- **Q1** is short-answer for now. When Ho-Ming's country list arrives, swap it to
  a dropdown (commented `ListItem` block in `addQ1_country()`); keep the title
  identical.
- **Q8** caps at 3 selections via `CheckboxValidation.requireSelectAtMost(3)`.
- The term "Silent Exodus" appears nowhere in the form, by design.
- Re-running `buildSurvey()` creates a new Form and Sheet each time — delete
  stale copies from Drive if you run it more than once.
