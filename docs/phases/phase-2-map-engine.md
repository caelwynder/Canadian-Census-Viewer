# Phase 2 — Shared Map Engine

**Status:** Complete · committed as `808b7c9 feat: add shared map engine` (branch `phase-1-2-census-engine`)

## Goal

Replace the two nearly identical Ontario and Canada pages with one page backed by shared, tested modules, and switch both to the Phase 1 data.

## What was added

- **`code/map.html`**: one page for both views. `?region=ontario|canada` picks the region and `&metric=` picks the metric, so a link reopens the same view. It has a dark side panel with a region switch, a metric picker, a legend and a detail panel (hover to preview, click to zoom and pin).
- **`code/js/`** (plain scripts on a `window.CensusViewer` namespace, so the page still works from disk):
  - `format.js`: number, percent and change formatting.
  - `breaks.js`: quantile and fixed colour classes.
  - `metrics.js`: the metric registry. Each entry is `{id, label, theme, unit, value, breaks?, colors?}`. It started with population, change 2011–2016 (diverging) and share aged 65+.
  - `regions.js`: region parsing from the URL and the Ontario filter.
  - `map.js`: Leaflet setup, styling, legend and detail panel.
- **`test/`**: `node:test` suites for format, breaks, metrics and regions, plus `load-site-scripts.mjs`, which loads the browser scripts into Node for testing.

## What was removed

- `code/canada-map/canada-map.html`, `code/ontario-map/ontario-map.html` (about 95% duplicated code)
- `canadadata.js` (27.6 MB), `ontariodata.js`, and the unused `wards.js`
- The triple GeoJSON draw, dead marker code, the unpinned geocoder script, and the tile layers

## Key decisions

- **No background tiles.** CARTO, OSM and Stadia all refuse `file://` pages, so the divisions sit on a plain dark background. Tiles could return if the site is ever served locally.
- **Colour classes are computed per region**, so Ontario gets its own ranges instead of Canada's.
- **`main.html` links** now point to `map.html`. The user's earlier staged redesign of `main.html` went into this commit too, because both changes were in the same file.

## Verification

- 58 tests passing; coverage was 99.4% lines and 97.6% branches.
- Chrome from disk: Ontario shows 49 divisions and Canada 293. Hover, metric switching, the legend, URL sync, click-to-pin and the phone-width layout all work, with no console errors.
