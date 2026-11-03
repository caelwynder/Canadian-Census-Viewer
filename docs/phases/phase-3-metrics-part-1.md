# Phase 3 — Metrics Part 1 and Census-Year Timeline

**Status:** Complete · committed as `b2c198b feat: add land area from 2016 census profile` and `ca6cb50 feat: add age, density and sex metrics with census-year timeline`

## Goal

Add every metric the 2016 age/sex table supports, plus density, and let users move between the 2006, 2011 and 2016 censuses.

## Pieces

| Piece | Result |
|---|---|
| 3a. Land area | From StatCan's 2016 Census Profile, written to `code/data/census-profile-2016.js` (8 KB) |
| 3b. More metrics | 3 → 9 metrics, each for 2006/2011/2016, grouped by theme in the picker |
| 3c. Comparable colours | Colour classes come from all three years together, so a colour means the same value in every year |
| 3d. Timeline | Year buttons; years a metric lacks are disabled; the year is kept in the URL and region links; the detail panel shows the active metric for all three years |
| 3e. Checks | Tests, coverage and browser runs |

## Metrics (9)

- **Population:** population, change over 5 years (2011, 2016), density
- **Age:** shares aged 0–14, 15–64, 65+ and 85+, and the dependency ratio
- **Sex:** males per 100 females (diverging around 100)

## What was added or changed

- **`scripts/fetch-boundaries.mjs` → `scripts/fetch-data.mjs`**: now also downloads the 2016 Census Profile (`98-401-X2016050`, 156 MB) from the same checksum-pinned mirror.
- **New `scripts/lib/`**:
  - `zip-entry.mjs`: streams a single entry out of a zip using only Node built-ins.
  - `csv.mjs`: a streaming CSV line parser.
  - `census-profile.mjs`: pulls land area (and population, for cross-checking) per census division from the 1.25 GB CSV in about 7 seconds.
- **`scripts/lib/validate.mjs`**: the build fails if a division lacks land area, if its profile population differs from the age table beyond StatCan's rounding, or if computed density doesn't match StatCan's published figure. All 293 divisions pass.
- **`code/js/metrics.js`**: year-aware registry (`years`, `yearFor`, `allValues`, `themes`).
- **`code/js/map.js` and `code/map.html`**: timeline buttons, grouped metric picker, and a three-year detail panel.
- **`code/js/format.js`**: density formatting.

## Notes

- Three expected test values were wrong (the code was right); the tests were fixed.
- The density check was loosened slightly for Toronto, because StatCan rounds land area before computing density.
- **Lead-in to Phase 4:** the same 2016 Census Profile has all 2,247 characteristics per division (income, housing, immigration, language, education, commuting). Phase 4 can use it with no boundary mismatch.

## Verification

- 83 tests passing (re-confirmed 2026-10-28); coverage 99.6% lines, 98.0% branches.
- Chrome, Ontario: all 26 metric/year combinations recolour the map; opening "change" with 2006 falls back to 2016.
- Chrome, Canada: 293 divisions with a sensible density legend.
- Not covered: no linter or type checker in the project; `map.js` Leaflet code has no automated tests yet (Phase 7).
