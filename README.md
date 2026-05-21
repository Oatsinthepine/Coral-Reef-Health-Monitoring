# Mapping Coral Reef Health in the Great Barrier Reef

## 1. Project overview

This repository contains the interactive narrative visualisation for the FIT5147
Data Visualisation Project (DVP). It is a single-page dashboard that
communicates long-term coral condition, benthic cover indicators, ecological
disturbance relationships, and protected-area spatial context across the
Australian Institute of Marine Science (AIMS) management sectors of the Great
Barrier Reef.

The dashboard is built with HTML, CSS and vanilla JavaScript (ES modules),
using D3.js for the statistical charts, Leaflet for the geographic map, and
Vite as the build tool.

## 2. Main visualisation components

The dashboard contains five linked views:

1. **Reef map (Leaflet).** Reef monitoring sites coloured by management sector,
   overlaid with a simplified CAPAD marine protected-area layer. Clicking a
   reef sets the active sector across the dashboard.
2. **Live and dead coral cover over time (D3 line chart).** Mean live coral and
   mean dead coral cover by year for the selected sector and period.
3. **Benthic cover indicators (D3 stacked area chart).** Yearly mean hard
   coral, soft coral and algae cover for the selected sector and period.
4. **Ecological indicator by sector (D3 bubble scatter).** Sector-year mean
   cover for the selected indicator (hard coral / soft coral / algae); bubble
   size encodes the reef-year sample count contributing to each point.
5. **Relationship overview (D3 correlation heatmap).** Pearson correlation
   coefficients among reef condition and disturbance indicators, computed once
   from complete reef-year cases.

## 3. Interaction guide

| Control / action | Effect |
|------------------|--------|
| **Sector dropdown** | Filters the trend, benthic and bubble charts to one sector, and highlights matching reef markers on the map. |
| **Period buttons** (`All`, `1993–2005`, `2006–2015`, `2016–2023`) | Restrict the year range used by the trend, benthic and bubble charts. |
| **Indicator dropdown** (`Hard coral`, `Soft coral`, `Algae`) | Switches the measure displayed in the ecological indicator bubble chart. |
| **Hover a reef marker** | Shows reef name, sector, shelf, protected-area status and CAPAD attribution. |
| **Click a reef marker** | Sets the dashboard sector to the clicked reef's sector. |
| **"Show all sectors" button** | Resets the sector filter to `All`. |
| **Hover a chart** | Boundary-safe tooltip with the underlying values (year, mean cover, reef-year count, etc.). |
| **Click a line / area legend item** | Focus that series in the trend or benthic chart; click again to reset. |
| **Click a heatmap cell** | Selects the relationship and populates the explanation panel with Pearson r, Spearman ρ, complete-case count and the interpretation. |

## 4. Data files

The following files must be present in `public/data/` before running the
project:

- `aims_longterm_master_with_spatial.csv` — Reef-year master records with
  AIMS indicators joined to spatial context.
- `reef_points.csv` — Reef coordinates used to plot points on the map.
- `reef_spatial_context.csv` — Marine protected-area attributes per reef.
- `correlation_matrix_long.csv` — Precomputed Pearson / Spearman correlation
  matrix (long format) used by the heatmap.
- `capad_gbr_simplified.geojson` — Simplified CAPAD marine protected-area
  polygons clipped to the Great Barrier Reef region (optional but recommended
  for the map overlay).

### Original data sources

- **AIMS Long-term Monitoring Program** — reef-year condition and disturbance
  indicators, reef coordinates.
- **MMP Coral 2024** — supplementary recent coral context.
- **CAPAD Marine 2024** — Collaborative Australian Protected Areas Database
  (marine areas).

The CSV and GeoJSON files were produced in the upstream Data Exploration
Project; the dataloader expects them to be present under `public/data/`.

## 5. Setup and running locally

Prerequisites: **Node.js 18 or newer**.

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal (defaults to
`http://localhost:5173`).

## 6. Build and preview

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build for inspection
```

## 7. Project structure

```
Coral-Reef-Health-Monitoring/
├── index.html                  # Single-page layout (header, controls, 5 chart sections, summary)
├── package.json                # Dependencies and npm scripts
├── vite.config.js              # Vite configuration
├── public/
│   └── data/                   # CSV and GeoJSON data files (see section 4)
└── src/
    ├── main.js                 # Bootstrap: loads data, initialises controls and charts, dispatch loop
    ├── dataloader.js           # CSV + optional GeoJSON loading and normalisation
    ├── state.js                # Shared application state and period / indicator definitions
    ├── utils.js                # Filtering, sector-label, and formatting helpers
    ├── interaction/
    │   └── filters.js          # Builds the sector / period / indicator controls and syncs them to state
    ├── viz/
    │   ├── ReefMap.js          # Graph 1 — Leaflet reef map
    │   ├── OverallTimeTrend.js # Graph 2 — live / dead coral line chart
    │   ├── BenthicComposition.js # Graph 3 — benthic stacked area
    │   ├── EcologicalIndicator.js # Graph 4 — sector bubble scatter
    │   └── CorrelationHeatmap.js  # Graph 5 — correlation heatmap
    └── styles/
        └── style.css           # Dashboard styling and responsive rules
```

## 8. Libraries used

- **D3.js** (v7) — data loading, aggregation, scales, axes, stack layout and
  rendering for the four statistical charts.
- **Leaflet** (v1.9) — interactive base map, GeoJSON overlay and reef
  point markers for Graph 1.
- **Vite** (v6) — development server and production bundler.

No frontend framework (React / Vue / Svelte) is used; all charts are vanilla
ES modules.

## 9. Design and implementation notes

- D3.js drives all statistical charts (line, stacked area, bubble scatter,
  heatmap). Each chart module exports `init(containerSelector, data, state,
  dispatch)` and `update(data, state)` so that the central dispatch loop in
  `src/main.js` can refresh every linked view from a single state change.
- Leaflet is used for the reef map because it handles Web Mercator
  projection, pan/zoom and GeoJSON overlays reliably and out of the box,
  which would require non-trivial code to reproduce in D3.
- The CAPAD marine protected-area layer was simplified before being committed
  to `public/data/`, so the map loads a small, fast GeoJSON instead of the
  original multi-megabyte source file. If the file is absent, the dataloader
  logs a warning and the dashboard continues to render with reef points only.
- The correlation matrix is precomputed in the upstream Data Exploration
  Project and loaded as a long-format CSV. This keeps the heatmap fast and
  deterministic and avoids running pairwise correlations in the browser.
- Tooltips share a single `.chart-tooltip` style and a boundary-safe
  positioning helper so they never overflow their chart container.
- Module-local state (e.g. legend focus, selected heatmap cell) is kept
  inside each chart module; shared interactive state (sector, period,
  indicator) lives in the global `appState` defined in `src/state.js`.

## 10. Limitations

- Benthic cover indicators (hard coral, soft coral, algae) are available for
  a subset of reef-year records. Years and reefs without these measurements
  are excluded from the benthic chart and from correlation computations that
  involve them.
- Correlation indicates statistical association only; it does **not** imply
  causation.
- Marine protected-area status is presented as spatial context. The dashboard
  does not attempt to estimate any management effect.
- The CAPAD overlay uses simplified geometry; it is intended for visual
  context, not for precise area calculations.
- The dashboard is an exploratory narrative visualisation, not a causal
  ecological model.

## 11. Author

- **Student name:** Ziyue Zhou
- **Student ID:** 30232872
- **Unit:** FIT5147 Data Visualisation Project
