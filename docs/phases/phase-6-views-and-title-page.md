# Phase 6 — Map Views and Title Page

**Status:** Complete · not yet committed

## Goal

Finish the map views planned for v2 (search, compare, province filter, themes, accessibility) and rebuild the title page in the concept F style the user chose in Phase 5.

## Pieces

| Piece | Result |
|---|---|
| 6a. Province filter | All 13 provinces and territories are regions (`?region=quebec`, `british-columbia`, …), picked from a menu in the control card. Headlines read "8.1 million people in Quebec, by mother tongue" |
| 6b. Search | "Find a census division" box on both pages. Picking a name zooms to the division and opens its profile. In Canada view, names carry the province, so the 30+ "Division No. 1"-style names stay distinct |
| 6c. Compare | "+ Compare" on similar-sized divisions. The profile then compares against that division instead of the region (cards, chart, age bars, every metric, ratio badges). The compared division is outlined in blue. `&vs=` keeps it in the URL. Medians and rates *are* compared between two divisions, since no summing is involved |
| 6d. Themes | ◐ button (map controls, title page) switches dark and light. Remembered per browser; defaults to dark. Map outlines and land colours follow the theme |
| 6e. Accessibility | Focus moves to the division name when a profile opens. A "Hide controls" button collapses the control card on phones. Reduced-motion users get no card hover animation |
| 6f. Title page | Rebuilt in the F style: headline, search, four view cards with live canvas thumbnails drawn from the real boundaries (Canada density, Canada dots, Ontario 65+, Quebec mother tongue), and links to every province and territory |

## Files

| File | Change |
|---|---|
| `code/css/tokens.css` | New. Colour tokens for dark and light, shared by both pages |
| `code/js/controls.js` | New. Control-card rendering moved out of `map.js`, plus search (`searchOptions`, `matchOption`), region menu and theme toggle |
| `code/js/thumbnails.js` | New. Fits boundaries into a canvas (`bounds`, `projector`) and draws choropleth or dot previews |
| `code/js/home.js` | New. Title-page logic |
| `code/js/regions.js` | All provinces and territories, plus `list` |
| `code/js/profile.js` | `compare()` accepts a division baseline; `joinRows()` moved here from `map.js` |
| `code/js/panel.js` | Generic comparison baseline, compare banner and buttons, focusable heading |
| `code/js/map.js` | Search, region menu, compare state, theme control, collapse; uses `controls.js` |
| `code/map.html`, `code/main.html` | Shared tokens, new controls; title page rewritten |

## Verification

- 130 tests passing (new: `controls.test.mjs`, `thumbnails.test.mjs`, region and compare tests).
- Coverage is 89.8% lines overall. The DOM-only code in `controls.js`, `panel.js`, `thumbnails.js` and `map.js` is not unit-tested; Phase 7's Playwright tests cover it.
- Chrome from disk, with no console errors:
  - Toronto compared with Peel.
  - Quebec dots in the light theme, with search jumping to Montréal and focusing its name.
  - The title page in dark, with all four thumbnails drawn.

## Notes

- `code/canada-map/` and `code/ontario-map/` (old screenshots and a 36.5 MB GeoJSON) are no longer referenced by any page. They're kept until the user decides whether to delete them.
- Still open from the concepts: the "you are here" minimap (F) and download CSV / share buttons (C).
