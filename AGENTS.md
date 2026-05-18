# AGENTS Guide

## Project scope

This repository is for the FIT5147 Data Visualisation Project (DVP), which is about coral reef health monitoring in the Great Barrier Reef.

The goal is to implement a single-page interactive narrative visualisation using only:

- HTML
- CSS
- JavaScript
- D3.js
- Vite

This is not a backend project, not a data science notebook project, and not a React/Vue/Svelte app.

The final implementation should prioritise:

1. correctness,
2. clarity,
3. stable D3 implementation,
4. readable code,
5. feasible interaction design.

Avoid over-engineering.

--

## Project structure

```plaintext
Coral-Reef-Health-Monitoring/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── data/
├── src/
│   ├── main.js
│   ├── dataloader.js
│   ├── state.js
│   ├── utils.js
│   ├── viz/
│   ├── interaction/
│   └── styles/
└── README.md
```

---

## Main working area

`Coral-Reef-Health-Monitoring/`

---

## Data

Use these files as the main source for implementation:

`public/data/aims_longterm_master_with_spatial.csv`
`public/data/reef_points.csv`
`public/data/reef_spatial_context.csv`
`public/data/Collaborative_Australian_Protected_Areas_Database_(CAPAD)_2024_Marine.geojson`


These files below are available for reference or additional preprocessing, but should not be the first choice for frontend chart drawing:

- `public/data/manta-tow-by-reef/manta-tow-by-reef.csv` (~2.6k rows, 22 cols): reef-level LTMP manta tow summaries.
- `public/data/ltmp_hc_sc_a_by_site/ltmp_hc_sc_a_by_site.csv` (~18.5k rows, 12 cols): site-level LTMP cover by `GROUP_CODE`/`COVER`.
- `public/data/Data_and_metadata_MMP_coral_2024/coral.csv` (~1.5k rows, 35 cols): MMP coral indicators.

---

## Coding guidelines

* Use vanilla JavaScript ES modules.
* Use D3.js for visualisations.
* Do not use React, Vue, Svelte, or other external charting libraries.
* Do not use jQuery.
* Keep each chart in its own module under `src/viz/`.
* Keep shared utility functions in `src/utils.js`.
* Keep tooltip logic in `src/interaction/tooltip.js`.
* Keep filter/control logic in `src/interaction/filters.js` if needed.
* Avoid large rewrites of unrelated modules.
* Prefer simple, readable D3 code over abstract code, avoid over-engineering.
* Clear/redraw update logic is acceptable if performance remains fine.
* Use comments to explain non-obvious data transformations and interactions.

Each chart module should expose:

```javascript
export function init(containerSelector, data, state, dispatch) {
  // create SVG, static elements, initial render
}

export function update(data, state) {
  // redraw or update the chart based on state
}
```

If a module needs internal helper functions, keep them inside the module unless reused elsewhere.

## Styling guidelines

Use `src/styles/style.css`.

Design style:

* clean academic dashboard style
* readable typography
* subtle borders or card sections
* consistent colour usage
* accessible labels and legends
* avoid visual clutter

Recommended layout:

* max-width around 1200px
* narrative sections
* grid or flex-based chart layout
* responsive enough for a normal laptop screen

Narrative requirements

The page should read as an interactive narrative, not just a chart gallery.

Recommended narrative flow:

1. Introduction: why coral reef health matters.
2. Spatial overview: where monitored reefs are.
3. Long-term condition: live/dead coral trends.
4. Benthic structure: hard coral, soft coral, algae.
5. Sector variation: selected ecological indicator by sector.
6. Relationship overview: condition and disturbance heatmap.
7. Summary, limitations, data sources.

Each chart section should include:

* a short title
* a short explanatory paragraph
* a user instruction if interaction may not be obvious

⸻

Do not do

* Do not add extra charts beyond the five planned graphs unless explicitly requested.
* Do not implement complex animations before the static and interactive basics work.
* Do not overcomplicate state management.
* Do not change the agreed dashboard narrative without confirmation.

⸻

## Operational guidance for agents

### Development phases

Below is the overall guidence, follow the staged development plan. Do not attempt to implement the entire dashboard in one step.

Phase 0 — Project scaffold

Create or verify:

* Vite setup
* package.json
* vite.config.js
* index.html
* src/ structure
* empty chart modules
* basic CSS

---

Phase 1 — Data loading

Implement:

* src/dataloader.js
* data type conversion
* boolean field normalisation
* console summaries for loaded data

---

Phase 2 — Static layout

Implement:

* narrative page sections
* chart containers
* user guide section
* data notes and footer
* placeholder boxes

---

Phase 3 — State and controls

Implement:

* shared state
* sector dropdown
* period selector
* indicator selector
* dispatch events

---

Phase 4 — Graph 2 and Graph 3

Implement:

* live/dead coral trend line chart
* benthic stacked area chart

---

Phase 5 — Graph 4

Implement:

* ecological indicator by sector chart

---

Phase 6 — Graph 5

Implement:

* correlation heatmap
* tooltip and explanation panel

---

Phase 7 — Graph 1

Implement:

* reef point map
* tooltip
* sector selection
* optional simplified CAPAD overlay only if feasible

---

Phase 8 — Coordinated interaction and polish

Implement:

* sector selection linkage
* period linkage
* final tooltips
* responsive layout cleanup
* no console errors

---

## Submission awareness

This is an academic DVP submission, the final code should:

* run locally with `npm run dev`
* have clear README instructions
* use local data files from `public/data/`
* not depend on private APIs
* not require internet access except for package installation
* have no console errors
* keep source code and data organised for marking