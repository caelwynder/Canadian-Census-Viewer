# Phase 5 — Map Redesign (Concept F + Concept C)

**Status:** Complete · committed as `9c2768c fix: decode census division names as Latin-1` and `d738ab0 feat: redesign map with dot density view and division profiles`

## Goal

The user's direction (2026-10-28): keep the **concept F** interface and its dot-density map, show division data the way **concept C** does, and keep the original choropleth of census divisions. This replaces the original Phase 5 (title page). The title page moves to Phase 6 and will use the F style.

## What the page looks like now

- **Concept F shell**:
  - Full-bleed map with a floating control card: logo, Ontario/Canada switch, a big headline, and an intro line.
  - Zoom buttons at the top right.
  - A status bar at the bottom left with the census-year buttons and the source.
- **View toggle**: *Choropleth* (default; the Phase 2–4 map with all 27 metrics) or *Dot density*.
- **Dot density**:
  - One dot per 1,000 people (or households, for tenure), placed at random inside each division.
  - "Colour dots by" chips: Age (2006, 2011, 2016), Mother tongue, Immigrant status and Tenure (2016 only).
  - Drawn on a single canvas: about 35,000 dots for Canada, generated in about 40 ms.
  - Dots are seeded per division, so they stay in place between renders.
- **Concept C division profile**: click any division, in either view, to open a drawer with:
  - A plain-language summary: size rank, share of the region, growth against the region, and age skew.
  - Four stat cards with ratio-to-region badges.
  - A growth chart (index, 2006 = 100) and age-structure bars, each against the region.
  - Every metric grouped by theme, with the region value and a ratio badge.
  - Similar-sized divisions you can jump to.
- **URL** keeps `region`, `view`, `metric`, `dots`, `year` and `cd` (the pinned division), so any view can be shared. Escape closes the drawer.

## Files

| File | Change |
|---|---|
| `code/js/dots.js` | New. Dot schemes, category counts (with remainders such as "Other languages"), point-in-polygon, seeded random, placement |
| `code/js/profile.js` | New. Region aggregate, division against region comparison, rank, summary sentences, growth index, similar divisions |
| `code/js/panel.js` | New. Renders the concept C drawer: cards, SVG chart, bars, theme lists |
| `code/js/dot-layer.js` | New. Leaflet canvas layer for the dots |
| `code/js/map.js` | Rewritten around the two views, the drawer and the URL state |
| `code/map.html` | Rebuilt in the F style (Space Grotesk, Inter, JetBrains Mono; orange accent) |
| `code/js/metrics.js` | Medians and published rates are flagged `additive: false`, so they get no region ratio |
| `code/js/regions.js` | Demonyms for headlines ("Ontarians", "Canadians") |
| `scripts/lib/boundaries.mjs` | **Bug fix:** the shapefile DBF is Latin-1, but it was being read as UTF-8, so 29 names showed "Montr�al" and similar. Data rebuilt |

## Notes and limits

- **Dots show how many people, not exactly where they live.** We only have census-division data, so dots are spread evenly across each division (the page says so). Concept F's "hide unpopulated land" needs dissemination-area data, which isn't in the project.
- Region values in the profile are sums of the divisions. Medians and published rates (income, median age, low-income, participation, unemployment, shelter costs) have no regional figure, so they show no badge.
- Concept C's "Compare A vs B" and the "you are here" minimap from F are not built yet; they belong in Phase 6.

## Verification

- 120 tests passing (new: `test/dots.test.mjs`, `test/profile.test.mjs`, plus a boundary-name encoding test).
- Chrome from disk, with no console errors:
  - Ontario dots by age.
  - Canada dots by mother tongue (the Quebec French pattern is clear).
  - Toronto and Montréal profiles, pinned through the URL.
  - Choropleth on "Share aged 65+".
  - A 390 px phone viewport.

## Follow-ups

- `map.js` `start()` is long (about 180 lines of closures); split it when Phase 6 adds search and compare.
- On phones, the control card covers the top of the map; make it collapsible.
