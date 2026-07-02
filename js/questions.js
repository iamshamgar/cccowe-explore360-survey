/* ============================================================================
   CCCOWE 2026 Explore360 — Shared question configuration
   Single source of truth for option keys and human-readable labels.
   Used by both survey.js (form rendering) and dashboard.js (chart labels).
   ============================================================================ */

const EXPLORE360 = {
  storageKey: "cccowe-explore360-responses",

  q3_role: {
    order: ["senior_pastor", "local_lang_pastor", "associate_pastor", "youth_pastor", "lay_leader", "staff", "other"],
    labels: {
      senior_pastor: "Senior / Lead Pastor",
      local_lang_pastor: "Local-language / English ministry pastor",
      associate_pastor: "Associate / Assistant Pastor",
      youth_pastor: "Youth / Young Adults Pastor",
      lay_leader: "Lay leader / Elder / Deacon",
      staff: "Staff (non-pastoral)",
      other: "Other",
    },
  },

  q4_languages: {
    order: ["1", "2", "3", "4plus"],
    labels: { "1": "1", "2": "2", "3": "3", "4plus": "4 or more" },
  },

  q5_communities: {
    order: ["long_established", "cantonese", "mandarin", "recent_hk", "taiwan", "sea_diaspora", "local_born", "other"],
    labels: {
      long_established: "Long-established multi-generational families",
      cantonese: "Cantonese / Hong Kong-origin arrivals",
      mandarin: "Mandarin-speaking arrivals from mainland China",
      recent_hk: "Recent Hong Kong arrivals (BNO or similar)",
      taiwan: "Taiwan-origin families",
      sea_diaspora: "Southeast Asian Chinese diaspora",
      local_born: "Locally born next generation",
      other: "Other",
    },
  },

  q6_relative_size: {
    order: ["sig_smaller", "somewhat_smaller", "about_same", "somewhat_larger", "sig_larger", "single_language"],
    labels: {
      sig_smaller: "Significantly smaller",
      somewhat_smaller: "Somewhat smaller",
      about_same: "About the same",
      somewhat_larger: "Somewhat larger",
      sig_larger: "Significantly larger",
      single_language: "Single-language church",
    },
  },

  q7_youth: {
    order: ["stay_heritage", "move_local", "step_away", "mix", "dont_know"],
    labels: {
      stay_heritage: "Most stay in a Chinese heritage church",
      move_local: "Most move to a non-Chinese / local church",
      step_away: "Most step away from church altogether",
      mix: "It's a mix — no clear pattern",
      dont_know: "I don't know / we don't track this",
    },
  },

  q8_tensions: {
    order: ["language_gap", "next_gen", "integrating", "limited_staff", "financial", "political", "leaving", "grief", "leaders", "other"],
    labels: {
      language_gap: "Language gap between generations",
      next_gen: "Retaining & discipling the next generation",
      integrating: "Integrating newer arrivals with established members",
      limited_staff: "Limited pastoral staff, resources or structure",
      financial: "Financial or facility constraints",
      political: "Political or cultural differences within the congregation",
      leaving: "Members leaving for other churches",
      grief: "Caring for grief & needs of recent immigrants",
      leaders: "Raising up & empowering new leaders",
      other: "Other",
    },
  },

  q9_hope: {
    min: 1,
    max: 5,
    minLabel: "Not hopeful at all",
    maxLabel: "Extremely hopeful",
  },

  q10_hope_sources: {
    order: ["next_gen_leaders", "new_arrivals", "discipleship", "cross_region", "new_models", "renewed_calling", "reclaiming", "theology", "other"],
    labels: {
      next_gen_leaders: "Next-generation leaders stepping into roles",
      new_arrivals: "New arrivals bringing energy and growth",
      discipleship: "Deeper discipleship & spiritual formation",
      cross_region: "Growing connection across regions",
      new_models: "New models of ministry emerging",
      renewed_calling: "A renewed sense of calling in my ministry",
      reclaiming: "Young people reclaiming heritage & identity",
      theology: "Theological richness of the tradition",
      other: "Other",
    },
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = EXPLORE360;
}
