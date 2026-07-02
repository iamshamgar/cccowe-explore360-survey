#!/usr/bin/env python3
"""Generate ~40 realistic CCCOWE Explore360 sample delegate responses."""
import json, random, datetime

random.seed(360)

# (country, [likely churches])
CHURCHES = {
    "United Kingdom": ["London Chinese Lutheran Church — London", "Chinese Church in London — London",
                        "Manchester Chinese Christian Church — Manchester", "Birmingham Chinese Church — Birmingham"],
    "Sweden": ["Stockholm Chinese Christian Church — Stockholm", "Gothenburg Chinese Church — Gothenburg"],
    "Norway": ["Oslo Chinese Christian Church — Oslo"],
    "Finland": ["Helsinki Chinese Christian Church — Helsinki"],
    "United States": ["Boston Chinese Evangelical Church — Boston", "Chinese Bible Church of Greater Boston — Lexington",
                      "River of Life Christian Church — Santa Clara", "NYC Chinese Alliance Church — New York",
                      "Chinese Christian Church of NJ — Parsippany", "Houston Chinese Church — Houston"],
    "Canada": ["Toronto Chinese Community Church — Toronto", "Vancouver Chinese Baptist Church — Vancouver",
               "Richmond Chinese Alliance Church — Richmond"],
    "Australia": ["Sydney Chinese Christian Church — Sydney", "Melbourne Chinese Presbyterian Church — Melbourne",
                  "Chinese Methodist Church Perth — Perth"],
    "Malaysia": ["Kuching Evangelical Church — Kuching", "Trinity Methodist Church KL — Kuala Lumpur",
                 "Emmanuel Baptist Church — Petaling Jaya"],
    "Singapore": ["Bethesda Chinese Church — Singapore", "Chinese Methodist Church — Singapore"],
    "New Zealand": ["Auckland Chinese Presbyterian Church — Auckland"],
    "Germany": ["Chinese Christian Church Frankfurt — Frankfurt"],
    "Netherlands": ["Chinese Church in the Netherlands — Amsterdam"],
    "France": ["Église Chinoise de Paris — Paris"],
    "Japan": ["Tokyo Chinese Christian Church — Tokyo"],
}

# weighted country pool (US/Canada/UK/Australia heavier, Nordic represented)
COUNTRY_WEIGHTS = {
    "United States": 8, "Canada": 5, "United Kingdom": 5, "Australia": 4,
    "Malaysia": 3, "Sweden": 2, "Norway": 2, "Finland": 2, "Singapore": 2,
    "New Zealand": 1, "Germany": 1, "Netherlands": 1, "France": 1, "Japan": 1,
}

ROLES = ["senior_pastor", "local_lang_pastor", "associate_pastor", "youth_pastor",
         "lay_leader", "staff", "other"]
ROLE_W = [7, 5, 4, 4, 6, 2, 1]

LANGS = ["1", "2", "3", "4plus"]
LANG_W = [2, 8, 7, 3]

COMMUNITIES = ["long_established", "cantonese", "mandarin", "recent_hk",
               "taiwan", "sea_diaspora", "local_born", "other"]

SIZES = ["sig_smaller", "somewhat_smaller", "about_same", "somewhat_larger",
         "sig_larger", "single_language"]
SIZE_W = [6, 7, 4, 2, 1, 3]

YOUTH = ["stay_heritage", "move_local", "step_away", "mix", "dont_know"]
YOUTH_W = [3, 5, 4, 7, 3]

TENSIONS = ["language_gap", "next_gen", "integrating", "limited_staff",
            "financial", "political", "leaving", "grief", "leaders", "other"]
TENSION_W = [9, 10, 5, 6, 4, 3, 4, 3, 6, 1]

HOPE_SOURCES = ["next_gen_leaders", "new_arrivals", "discipleship", "cross_region",
                "new_models", "renewed_calling", "reclaiming", "theology", "other"]
HOPE_W = [8, 5, 7, 6, 5, 6, 5, 4, 1]

HOPE_SCORE_W = {1: 1, 2: 3, 3: 8, 4: 10, 5: 5}  # skew toward 3–4


def wpick(items, weights):
    return random.choices(items, weights=weights, k=1)[0]


def wsample(items, weights, kmin, kmax):
    k = random.randint(kmin, kmax)
    chosen = []
    pool = list(zip(items, weights))
    while len(chosen) < k and pool:
        it = random.choices([p[0] for p in pool], weights=[p[1] for p in pool], k=1)[0]
        chosen.append(it)
        pool = [p for p in pool if p[0] != it]
    return chosen


def hope_score():
    scores = list(HOPE_SCORE_W.keys())
    weights = list(HOPE_SCORE_W.values())
    return random.choices(scores, weights=weights, k=1)[0]


responses = []
base = datetime.datetime(2026, 7, 21, 9, 15, 0)
countries = list(COUNTRY_WEIGHTS.keys())
cweights = list(COUNTRY_WEIGHTS.values())

for i in range(40):
    country = wpick(countries, cweights)
    church = random.choice(CHURCHES[country])
    size = wpick(SIZES, SIZE_W)

    # single-language churches skew community set & langs
    if size == "single_language":
        langs = wpick(["1", "2"], [4, 3])
    else:
        langs = wpick(LANGS, LANG_W)

    ts = base + datetime.timedelta(minutes=i * random.randint(1, 4),
                                   seconds=random.randint(0, 59))

    responses.append({
        "id": f"s-{i+1:03d}",
        "timestamp": ts.isoformat() + "Z",
        "source": "sample",
        "q1_country": country,
        "q2_church": church,
        "q3_role": wpick(ROLES, ROLE_W),
        "q4_languages": langs,
        "q5_communities": wsample(COMMUNITIES, [5,6,7,3,4,3,8,1], 1, 4),
        "q6_relative_size": size,
        "q7_youth": wpick(YOUTH, YOUTH_W),
        "q8_tensions": wsample(TENSIONS, TENSION_W, 1, 3),
        "q9_hope": hope_score(),
        "q10_hope_sources": wsample(HOPE_SOURCES, HOPE_W, 1, 4),
    })

with open("sample-responses.json", "w", encoding="utf-8") as f:
    json.dump(responses, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(responses)} responses across "
      f"{len(set(r['q1_country'] for r in responses))} countries.")
