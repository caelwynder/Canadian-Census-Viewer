# Phase 1 — Data Pipeline

**Status:** Complete · committed as `b5fe17e feat: add census data pipeline` (branch `phase-1-2-census-engine`)

## Goal

Replace the 31 MB hand-exported data files with a reproducible pipeline that produces small, accurate, browser-loadable data, and fix the broken coastlines on the Canada map.

## What was added

- **`package.json` / `package-lock.json`**: npm scripts and the only dependency, mapshaper 0.7.71 (pinned).
- **`.gitignore`**: excludes the raw downloads in `code/data/raw/`.
- **`scripts/fetch-boundaries.mjs`** (`npm run data:fetch`): downloads the 2016 **cartographic** census-division boundary file (`lcd_000b16a_e`). StatCan returns 403 to scripted downloads, so it falls back to a mirror run by Data for Canada and checks the file against a pinned SHA-256 either way.
- **`scripts/build-data.mjs`** (`npm run data:build`): runs the full pipeline.
- **`scripts/lib/`**:
  - `dbf.mjs`: a minimal DBF reader for the 2016 age/sex table (`98-402-X2016002-T1-CD-eng.dbf`).
  - `census-table.mjs`: header check, column mapping, merging the three sex rows, nulls for suppressed values, skipping blank rows.
  - `boundaries.mjs`: mapshaper simplification (keeps 1.5% of vertices).
  - `validate.mjs`: join validation between boundaries and census rows, plus a national-total check.
  - `js-global.mjs`: writes `window.X = …` files.
- **`scripts/paths.mjs`**: shared input/output paths.

## Outputs

| File | Contents | Size |
|---|---|---|
| `code/data/census-boundaries.js` | 293 census divisions with real coastlines | 1.36 MB |
| `code/data/census-age-sex-2016.js` | 45 counts per division: total and 4 age groups × 2006/2011/2016 × total/male/female | 292 KB |

Total **1.65 MB, down from about 31 MB**.

## Key decisions

- **Node instead of Python.** The machine had no Python geo stack or GDAL, but did have Node 24.
- **Tooling in `scripts/` at the repo root**, so it stays out of the website folder.
- **Ontario is a filter** (`pruid === "35"`, 49 divisions), so the separate Ontario file is gone.
- **Suppressed counts become `null`, not `0`** (e.g. Stikine, Kitikmeot).
- **The build fails** if any boundary lacks a census row (or the reverse), or if the national sum is more than 1,000 off the official 35,151,728. The actual sum is 35,151,755; the difference comes from StatCan's random rounding.

## Verification

- 32 tests passing; library coverage was 98.9% lines and 96.4% branches.
- Both data files load in Chrome from `file://` with Leaflet and no console errors.
