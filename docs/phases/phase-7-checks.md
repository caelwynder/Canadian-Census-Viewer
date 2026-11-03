# Phase 7 — Checks, Audit and README

**Status:** Complete · not yet committed

## Goal

Cover the browser-only code with real browser tests, audit both pages with Lighthouse, and write a README for v2.

## What was added

- **Playwright browser tests** (`e2e/site.spec.mjs`, `playwright.config.mjs`, `npm run test:e2e`). They run against the installed Chrome, from `file://`, so no browser download or server is needed. Every test also fails on any console error. 9 tests:
  - The title page draws all four thumbnails; title-page search opens Montréal on the map.
  - Changing the metric updates the headline, legend, URL and disabled years.
  - The dot density toggle, colour schemes, and back to choropleth.
  - Clicking a division opens its profile with focus on the name; Escape closes it.
  - Compare sets and clears the baseline.
  - The region menu loads Quebec (98 divisions).
  - The theme choice carries across pages.
  - On a phone, "Hide controls" collapses the card.
- **Lighthouse fixes**:
  - The profile's theme lists were invalid `<dl>` markup; region values and badges now sit in a second `<dd>`.
  - Both pages gained a meta description.
- **README.md**: features, layout, commands, data sources and limits. It carries the original project timeline forward.
- **Archive** (done at the start of this phase, committed as `bc8467c`): the v1 map folders and unused shapefiles moved to `archive/`.

## Results

| Page | Accessibility | Best practices | SEO | Agentic browsing |
|---|---|---|---|---|
| Title page (mobile) | 100 | 100 | 100 | 100 |
| Map with profile open (desktop) | 100 | 100 | 100 | 100 |

The first map audit had accessibility 97 and SEO 90; both are fixed. Lighthouse performance wasn't measured (the audit tool excludes it). Layout shift on the map page was 0.077, within the "good" range (under 0.1).

- 130 unit tests and 9 browser tests passing.

## Left for later

- The "you are here" minimap (concept F), and CSV download and share buttons (concept C).
- Newer census years (2021) would need a new boundary set, because division boundaries changed.
