# Phase 4 — Metrics Part 2 (2016 Census Profile)

**Status:** Complete · not yet committed

## Goal

Add socio-economic metrics beyond age and sex. The plan originally pointed at the 2021 Census Profile. We chose the **2016 Census Profile** (`98-401-X2016050`, already downloaded in Phase 3) because it uses the same 293 boundaries, so no division is mismatched.

## Pieces

| Piece | Result |
|---|---|
| 4a. Pipeline | 28 more profile members extracted per division, with exact-name checks; `code/data/census-profile-2016.js` grows from 8 KB to 181 KB |
| 4b. Registry | 9 → 27 metrics across 9 themes; new `currency` and `years` units |
| 4c. Detail panel | Grouped by theme. A metric without the selected year shows its 2016 value, labelled "(2016)", instead of n/a |
| 4d. Checks | Tests, coverage, Ontario and Canada browser runs |

## New metrics (18, all 2016 only)

| Theme | Metrics |
|---|---|
| Age | Median age |
| Income | Median household income (income year 2015), low-income rate (LIM-AT) |
| Housing | Share of households renting, share spending 30%+ of income on shelter, median monthly shelter cost (owners, renters) |
| Immigration & diversity | Immigrants, visible minority, Indigenous identity |
| Language | Mother tongue English, mother tongue French, speaks English and French |
| Education & work | Bachelor's or higher (aged 25–64), participation rate, unemployment rate |
| Commute | Public transit, walking or cycling |

## What was added or changed

- **`scripts/lib/census-profile.mjs`**: `PROFILE_FIELDS` now lists each member with its denominator (`of`), percentage flag (`rate`), or `checkOnly`. The new `publishedProfile()` drops the cross-check fields (population, published density).
- **`scripts/lib/validate.mjs`**: the new `checkShares()` fails the build if a count exceeds its total by more than random rounding, or if a rate falls outside 0–100.
- **`code/js/metrics.js`**: `field()`, `ofTotal()` and `profile()` helpers; shares are computed in the browser from counts and their own universe totals.
- **`code/js/format.js`**: `currency` ("$65,829") and `years` ("39.3 years").
- **`code/js/map.js` and `code/map.html`**: detail panel grouped by theme.

## Differences from the plan

- **Core housing need is not in the 2016 profile** for census divisions. Spending 30%+ of income on shelter is the closest available stand-in.
- **27 metrics, not about 30.** Every theme in the plan is covered.

## Known data gaps (real StatCan gaps, shown as "No data")

- **Low-income rate:** missing for all 10 territorial divisions. StatCan doesn't apply LIM-AT in the territories.
- **Immigrants:** five divisions with incompletely enumerated reserves (4619, 4622, 4623, 4718, 5945) publish 0 of 0 for immigrant status. A zero total gives `null`, not 0%.
- Both gaps are pinned in `scripts/data-output.test.mjs`, so a rebuild can't change them silently.

## Verification

- 100 tests passing; coverage 99.7% lines, 97.8% branches.
- Chrome from disk:
  - Ontario: all 27 metrics recolour the map with sensible legends; profile metrics enable only the 2016 button.
  - Toronto's detail values match figures computed from the raw CSV.
  - Canada: 293 divisions, and no console errors.

## Follow-ups for Phase 6

- Quantile classes on very skewed metrics produce wide middle bins (French mother tongue: "6.1% – 83.4%"). Consider natural breaks or a log scale.
- Density shows "0.0 /km²" for very sparse northern divisions. It needs more decimals below 1.
- The detail panel is long at 27 rows; collapsible themes or a compact view would help.
