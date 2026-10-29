# Canadian Census Viewer

An interactive map of Canada's 293 census divisions, built from Statistics Canada's 2016 Census. It runs straight from disk: open `code/main.html` in a browser, with no server or install needed.

## What you can do

- **Choropleth map** of 27 measures: population, growth and density; age and sex; income; housing; immigration and diversity; language; education and work; commuting. Age and population measures cover 2006, 2011 and 2016.
- **Dot density** view: one dot per 1,000 people (or households), coloured by age, mother tongue, immigrant status or tenure.
- **Division profiles**: click any division for a plain-language summary, stat cards, a growth chart, age structure and every measure, each compared with its province or with another division.
- **Search** any division by name, filter to any **province or territory**, switch between **dark and light** themes, and share any view by its URL.

## Project layout

| Path | What it is |
|---|---|
| `code/main.html` | Title page |
| `code/map.html` | The map (`?region=ontario&view=dots&cd=3520` …) |
| `code/js/` | Plain browser scripts on a `window.CensusViewer` namespace |
| `code/data/*.js` | Generated census data, shipped as JS so the site works from `file://` |
| `scripts/` | Data pipeline (download, check, build) |
| `test/`, `scripts/**/*.test.mjs` | Unit tests (`node:test`) |
| `e2e/` | Browser tests (Playwright, using installed Chrome) |
| `docs/phases/` | What each development phase added |
| `archive/` | Files from the first version that nothing uses anymore |

## Development

Requires Node 24 and Google Chrome.

```sh
npm install
npm run data:fetch   # downloads StatCan boundary and profile files (about 190 MB, checksum-verified)
npm run data:build   # rebuilds code/data/*.js and validates every division
npm test             # unit tests
npm run test:e2e     # browser tests
```

The generated data is committed, so you only need the data steps to change or rebuild it.

## Data and licence

Statistics Canada, 2016 Census: Age and Sex Highlight Tables (98-402-X2016002), Census Profile (98-401-X2016050) and the census division cartographic boundary file (lcd_000b16a_e). Used under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).

Census division data has limits worth knowing:
- Dots are spread at random within each division, so they show how many people live there, not exactly where.
- StatCan doesn't publish the low-income rate for the territories.
- Five divisions with incompletely enumerated reserves have no immigration figures.

## Timeline

- 10/28/2026 v2: new data pipeline, 27 metrics, dot density, division profiles, search, compare, themes, new title page, browser tests
- 06/03/2025 Bug fixes made and README updated
- 06/02/2025 Project was opened back up because of code not working
- 10/23/2024 Website was finished
- 10/21/2024 Scope expanded to all of Canada
- 10/19/2024 Scale of the project grew and I started working on all of Ontario
- 10/15/2024 Initial website was finished
- 10/13/2024 The project was started originally to view London, Ontario's ward population
