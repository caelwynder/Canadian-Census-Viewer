# Canadian Census Viewer v2 — Phase Overview

The v2 plan (2026-10-25) expands the viewer from a single population map into a multi-metric census atlas, built from the "concept A" (dark atlas) direction in the Figma file: https://www.figma.com/design/F3QQcOioY6qfvrljEZdELz

| Phase | Scope | Status | Recap |
|---|---|---|---|
| 0 | UI concepts in Figma (6 originals + 5 research-based round-2 concepts) | Done | — |
| 1 | Data pipeline: cartographic boundaries, small JS data files | Done, committed `b5fe17e` | [phase-1-data-pipeline.md](phase-1-data-pipeline.md) |
| 2 | Shared map engine, single `map.html?region=` | Done, committed `808b7c9` | [phase-2-map-engine.md](phase-2-map-engine.md) |
| 3 | Metrics part 1 (2016 age/sex/density) + census-year timeline | Done, committed `b2c198b`, `ca6cb50` | [phase-3-metrics-part-1.md](phase-3-metrics-part-1.md) |
| 4 | Metrics part 2 from the 2016 Census Profile: income, housing, immigration, language, education, commute | Done, committed `32a3688` | [phase-4-metrics-part-2.md](phase-4-metrics-part-2.md) |
| 5 | Map redesign: concept F interface, dot-density view, concept C division profiles | Done, committed `d738ab0` (plus fix `9c2768c`) | [phase-5-map-redesign.md](phase-5-map-redesign.md) |
| 6 | Title page in the F style, plus map views: search, compare, province filter, themes, accessibility | Done, **not committed** | [phase-6-views-and-title-page.md](phase-6-views-and-title-page.md) |
| 7 | Checks: Playwright smoke tests, Lighthouse, README | Next | — |

## Working constraints

- The site must open straight from disk (`file://`), so data ships as JS globals (`window.CENSUS_*`), not JSON fetched at runtime.
- No background tile layer: free tile servers refuse `file://` pages.
- Tooling is Node 24 with `node:test`; the only dependency is mapshaper 0.7.71.
- Rebuild data with `npm run data:fetch && npm run data:build`; run `npm test` for the suite.
