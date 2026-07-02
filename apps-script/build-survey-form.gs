/**
 * ============================================================================
 * CCCOWE 2026 Explore360 — Survey Form Builder (Google Apps Script)
 * ============================================================================
 *
 * WHAT THIS DOES
 *   Running buildSurvey() once stands up the ENTIRE 10-question Explore360
 *   survey as a Google Form AND creates a linked Google Sheet as the response
 *   destination. Responses land in a Sheet whose column headers are the
 *   verbatim question titles (a leading "Timestamp" column is added by Forms
 *   automatically). A separate live dashboard reads those columns by their
 *   exact title strings, so DO NOT edit the question titles below.
 *
 * ----------------------------------------------------------------------------
 * PASTE-AND-RUN INSTRUCTIONS
 * ----------------------------------------------------------------------------
 *   1. Go to https://script.google.com  and click  New project.
 *   2. Delete the empty myFunction() stub, then paste this ENTIRE file in.
 *   3. (Optional) rename the project, e.g. "CCCOWE Explore360 Builder".
 *   4. In the toolbar function picker, select  buildSurvey.
 *   5. Click  Run.
 *   6. Google will ask you to authorize scopes (Forms, Sheets, Drive) — this
 *      is expected. Click through: choose your account -> Advanced ->
 *      "Go to <project> (unsafe)" -> Allow. (It says "unsafe" only because the
 *      script is unpublished and yours; it is your own code.)
 *   7. Run buildSurvey again if the first run stopped at the auth prompt.
 *   8. Open  View -> Logs  (or the Execution log panel at the bottom).
 *      You will see THREE URLs printed:
 *         - FORM EDIT URL       (edit the form / questions)
 *         - FORM RESPONSE URL   (the public link you share with delegates)
 *         - RESPONSE SHEET URL  (the linked Google Sheet the dashboard reads)
 *      Copy all three somewhere safe.
 *
 * ----------------------------------------------------------------------------
 * THE ONE MANUAL STEP APPS SCRIPT CANNOT DO HEADLESSLY  (read this)
 * ----------------------------------------------------------------------------
 *   A static/live dashboard needs to READ the response Sheet. Apps Script can
 *   set Drive link-sharing (this script sets the Sheet to "anyone with the link
 *   can view"), but it CANNOT toggle the classic "Publish to web" endpoint that
 *   exposes a clean CSV / gviz feed. You must do that once, by hand:
 *
 *      Open the RESPONSE SHEET URL  ->  File  ->  Share  ->  Publish to web
 *         -> "Entire document" (or the "Form Responses 1" sheet)
 *         -> format: Web page (or CSV, if your dashboard fetches CSV)
 *         -> Publish  -> confirm.
 *
 *   After publishing, the dashboard can read the data via one of:
 *      - gviz JSON:
 *          https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&sheet=Form%20Responses%201
 *      - CSV export (works once link-sharing is on, no publish needed):
 *          https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
 *      - Published CSV (from Publish-to-web, gives a /pub?output=csv URL).
 *   <SHEET_ID> is the long id in the RESPONSE SHEET URL. This script also logs
 *   the gviz URL for you at the end.
 *
 *   The dashboard's SHEET_URL config value should be set to the published Sheet
 *   URL (or the gviz/CSV endpoint above), NOT the Form URL.
 *
 * ----------------------------------------------------------------------------
 * NOTES
 *   - Every question is set required:true for clean dashboard data. To make any
 *     question optional, change its .setRequired(true) to .setRequired(false).
 *   - Q1 is short-answer for now. When Ho-Ming's country list arrives, swap it
 *     to a dropdown (see the commented ListItem block inside addQ1_country()).
 *   - Q8 enforces a MAX of 3 selections via CheckboxValidation.
 *   - The term "Silent Exodus" appears NOWHERE in this form, by design.
 *   - Re-running buildSurvey() creates a NEW form + NEW sheet each time. Delete
 *     stale copies from Drive if you run it more than once.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
var FORM_TITLE = 'CCCOWE 2026 Explore360 — The Evolving Chinese Church Around the Globe';
var FORM_DESCRIPTION =
  'A quick in-session survey of the delegates in this room. It maps the shared ' +
  'shape of Chinese heritage ministry across our countries, migration waves, ' +
  'languages, and generations. About 3 minutes — mostly one tap per question. ' +
  'Answer for YOUR own church context.';
var SHEET_TITLE = 'CCCOWE 2026 Explore360 — Responses';

// ----------------------------------------------------------------------------
// Main entry point — run this.
// ----------------------------------------------------------------------------
function buildSurvey() {
  var form = FormApp.create(FORM_TITLE);
  form.setDescription(FORM_DESCRIPTION);

  // In-session survey behavior: no login, no email capture, allow many
  // responses (shared devices are fine), show a progress bar.
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Thank you — your response is now part of the room. Watch the screen.');

  // --- Section 1: About Your Church (Q1–Q6) ---------------------------------
  // First section uses a header item (lives on page 1, no page break needed).
  form.addSectionHeaderItem()
      .setTitle('About Your Church')
      .setHelpText('Who are the people? Migration waves, languages, generations, structure.');

  addQ1_country(form);
  addQ2_churchNameCity(form);
  addQ3_role(form);
  addQ4_languageCount(form);
  addQ5_communities(form);
  addQ6_relativeSize(form);

  // --- Section 2: What's Pressing (Q7–Q8) -----------------------------------
  // Page break starts a new section/page.
  form.addPageBreakItem()
      .setTitle("What's Pressing")
      .setHelpText('What are the hardest tensions?');

  addQ7_youthOutcomes(form);
  addQ8_tensions(form);

  // --- Section 3: Hope and Future (Q9–Q10) ----------------------------------
  form.addPageBreakItem()
      .setTitle('Hope and Future')
      .setHelpText('What is the hope for the future of a healthy Chinese heritage church?');

  addQ9_hopeScale(form);
  addQ10_sourcesOfHope(form);

  // --- Response destination: a NEW linked Google Sheet ----------------------
  var ss = SpreadsheetApp.create(SHEET_TITLE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Programmatically set link-sharing on the Sheet to "anyone with link -> view"
  // so the dashboard can pull data. (Publish-to-web is still manual — see header.)
  try {
    DriveApp.getFileById(ss.getId())
            .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log('WARNING: could not set link-sharing automatically: ' + e +
               '\nSet it by hand: Sheet -> Share -> Anyone with the link -> Viewer.');
  }

  // --- Log the three URLs (+ gviz helper) -----------------------------------
  var editUrl = form.getEditUrl();
  var responseUrl = form.getPublishedUrl();
  var sheetUrl = ss.getUrl();
  var gvizUrl = 'https://docs.google.com/spreadsheets/d/' + ss.getId() +
                '/gviz/tq?tqx=out:json&sheet=Form%20Responses%201';

  var banner = [
    '',
    '==================== CCCOWE Explore360 — BUILD COMPLETE ====================',
    'FORM EDIT URL      : ' + editUrl,
    'FORM RESPONSE URL  : ' + responseUrl + '   <- share this with delegates',
    'RESPONSE SHEET URL : ' + sheetUrl + '   <- dashboard SHEET_URL config',
    'SHEET gviz FEED    : ' + gvizUrl,
    '',
    'MANUAL STEP: open the Response Sheet -> File -> Share -> Publish to web,',
    'then point the dashboard at the published Sheet / gviz / CSV endpoint.',
    '===========================================================================',
    ''
  ].join('\n');

  Logger.log(banner);
  if (typeof console !== 'undefined' && console.log) { console.log(banner); }
}

// ----------------------------------------------------------------------------
// Q1 — What country is your church in?   (short text; dropdown later)
// ----------------------------------------------------------------------------
function addQ1_country(form) {
  form.addTextItem()
      .setTitle('What country is your church in?')
      .setHelpText('Your country')
      .setRequired(true);

  // WHEN HO-MING'S COUNTRY LIST ARRIVES, delete the addTextItem() above and
  // use a dropdown instead. Title MUST stay identical (dashboard maps by it):
  //
  // form.addListItem()
  //     .setTitle('What country is your church in?')
  //     .setChoiceValues(['Australia', 'Canada', 'Malaysia', '...'])
  //     .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q2 — Church name and city   (short text)
// ----------------------------------------------------------------------------
function addQ2_churchNameCity(form) {
  form.addTextItem()
      .setTitle('Church name and city')
      .setHelpText('e.g., Boston Chinese Evangelical Church — Boston')
      .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q3 — What is your role in your church?   (multiple choice, single + Other)
// ----------------------------------------------------------------------------
function addQ3_role(form) {
  var item = form.addMultipleChoiceItem();
  item.setTitle('What is your role in your church?')
      .setChoiceValues([
        'Senior / Lead Pastor',
        'Local-language / English ministry pastor',
        'Associate / Assistant Pastor',
        'Youth / Young Adults Pastor',
        'Lay leader / Elder / Deacon',
        'Staff (non-pastoral)'
      ])
      .showOtherOption(true)
      .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q4 — How many languages...   (multiple choice, single)
// ----------------------------------------------------------------------------
function addQ4_languageCount(form) {
  var item = form.addMultipleChoiceItem();
  item.setTitle("How many languages are used across your church's regular services and ministries?")
      .setChoiceValues(['1', '2', '3', '4 or more'])
      .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q5 — Which communities...   (checkboxes, select all + Other)
// ----------------------------------------------------------------------------
function addQ5_communities(form) {
  var item = form.addCheckboxItem();
  item.setTitle('Which communities are part of your congregation? (Select all that apply)')
      .setChoiceValues([
        'Long-established / multi-generational Chinese families (in your country 2+ generations)',
        'Cantonese-speaking / Hong Kong-origin arrivals',
        'Mandarin-speaking arrivals from mainland China (students / professionals)',
        'Recent Hong Kong arrivals (e.g., BNO or similar pathways)',
        'Taiwan-origin families',
        'Southeast Asian Chinese diaspora',
        'Locally born next generation'
      ])
      .showOtherOption(true)
      .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q6 — Relative size of local-language/English congregation   (single)
// ----------------------------------------------------------------------------
function addQ6_relativeSize(form) {
  var item = form.addMultipleChoiceItem();
  item.setTitle('How large is your local-language/English-speaking congregation relative to your Chinese-speaking congregation(s)?')
      .setChoiceValues([
        'Significantly smaller',
        'Somewhat smaller',
        'About the same',
        'Somewhat larger',
        'Significantly larger',
        'We are a single-language church (no separate congregations)'
      ])
      .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q7 — Youth outcomes at adulthood   (single)   *** NEVER "Silent Exodus" ***
// ----------------------------------------------------------------------------
function addQ7_youthOutcomes(form) {
  var item = form.addMultipleChoiceItem();
  item.setTitle('When the young people who grow up in your church reach adulthood, what do you most often see?')
      .setChoiceValues([
        'Most stay and remain part of a Chinese heritage church',
        'Most move to a non-Chinese / local church',
        'Most step away from church altogether',
        "It's a mix — no clear pattern",
        "I don't know / we don't track this"
      ])
      .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q8 — Most pressing tension   (checkboxes, MAX 3 + Other)
// ----------------------------------------------------------------------------
function addQ8_tensions(form) {
  var item = form.addCheckboxItem();
  item.setTitle('What is the most pressing tension your church is navigating right now? (Select up to 3)')
      .setChoiceValues([
        'Language gap between generations',
        'Retaining and discipling the next generation',
        'Integrating newer arrivals with established members',
        'Limited pastoral staff, resources, or organizational structure',
        'Financial or facility constraints',
        'Political or cultural differences within the congregation',
        'Members leaving for other churches',
        'Caring for the grief and needs of recent immigrants',
        'Raising up and empowering new leaders'
      ])
      .showOtherOption(true)
      .setRequired(true);

  // Enforce the 3-selection cap.
  var validation = FormApp.createCheckboxValidation()
                          .setHelpText('Please select at most 3.')
                          .requireSelectAtMost(3)
                          .build();
  item.setValidation(validation);
}

// ----------------------------------------------------------------------------
// Q9 — How hopeful are you...   (linear scale 1–5)
// ----------------------------------------------------------------------------
function addQ9_hopeScale(form) {
  form.addScaleItem()
      .setTitle('How hopeful are you about the future of the Chinese heritage church in your context?')
      .setBounds(1, 5)
      .setLabels('Not hopeful at all', 'Extremely hopeful')
      .setRequired(true);
}

// ----------------------------------------------------------------------------
// Q10 — What gives you the most hope   (checkboxes, select all + Other)
// ----------------------------------------------------------------------------
function addQ10_sourcesOfHope(form) {
  var item = form.addCheckboxItem();
  item.setTitle('What gives you the most hope for the Chinese heritage church right now? (Select all that apply)')
      .setChoiceValues([
        'Next-generation leaders stepping into roles',
        'New arrivals bringing energy and growth',
        'Deeper discipleship and spiritual formation',
        'Growing connection between Chinese heritage churches and pastors across regions',
        'New models of ministry emerging (e.g., international or multilingual congregations)',
        'A renewed sense of calling in my own ministry',
        'Young people reclaiming their heritage and identity',
        'The theological richness of the Chinese heritage tradition'
      ])
      .showOtherOption(true)
      .setRequired(true);
}
