# Mapping Coral Reef Health in the Great Barrier Reef

## Technology Stack

![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)
![D3.js](https://img.shields.io/badge/D3.js-Interactive%20Charts-F9A03C?logo=d3dotjs&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-Interactive%20Map-199900?logo=leaflet&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF?logo=vite&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Semantic%20Layout-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Responsive%20Design-1572B6?logo=css3&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Continuous%20Deployment-2088FF?logo=githubactions&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Hosting-222222?logo=github&logoColor=white)

### FIT5147 Data Visualisation Project | Interactive Coral Reef Monitoring Dashboard

This project is an interactive narrative visualisation that explores long-term coral reef condition across the Great Barrier Reef. It combines spatial, temporal, ecological, and protected-area data to help users examine how coral condition varies across years and management sectors.

The dashboard integrates a Leaflet reef map with four D3.js statistical visualisations. Shared filters and linked interactions allow users to move from a broad spatial overview to detailed temporal and ecological comparisons.

The project was developed as an individual FIT5147 Data Visualisation Project at Monash University and has since been prepared as a public portfolio project.

## Live Demo

Open the deployed dashboard through GitHub Pages:

[![Launch Dashboard](https://img.shields.io/badge/Launch-Interactive%20Dashboard-0B7285?style=for-the-badge&logo=githubpages&logoColor=white)](https://oatsinthepine.github.io/Coral-Reef-Health-Monitoring/)

**Live URL:** https://oatsinthepine.github.io/Coral-Reef-Health-Monitoring/

The OpenStreetMap base layer requires an internet connection when using the dashboard.

---

## Project Overview

The dashboard is designed as a guided but exploratory data story. It communicates three main ideas:

- Coral reef condition changes over time rather than following a single uniform trend.
- Reef condition is spatially uneven across Great Barrier Reef management sectors.
- Multiple ecological indicators are required to interpret reef health responsibly.

The application is implemented as a single-page Vite project using vanilla JavaScript ES modules. D3.js is used for the statistical visualisations, Leaflet is used for the map, and GitHub Actions automatically builds and deploys the production site to GitHub Pages.

---

## Visualisation Architecture

```plaintext
AIMS reef monitoring data
CAPAD marine protected-area data
Precomputed correlation data
              |
              v
       Data loading layer
      src/dataloader.js
              |
              v
        Shared app state
         src/state.js
              |
              v
      Central dispatch loop
          src/main.js
              |
     +--------+--------+--------+--------+--------+
     |                 |                 |        |
     v                 v                 v        v
 Leaflet map      Line chart       Area chart  Bubble chart
     |                                              |
     +---------------- linked filters --------------+
                            |
                            v
                  Correlation heatmap
```

The dashboard follows a modular `init()` and `update()` lifecycle. Each visualisation module initialises its container once and then updates in response to shared state changes.

---

## Main Visualisation Components

### 1. Reef Map

The Leaflet map provides the spatial entry point to the dashboard.

- Reef monitoring sites are coloured by management sector.
- A simplified CAPAD marine protected-area layer provides geographic context.
- Hovering over a reef shows reef name, sector, shelf, and protected-area information.
- Clicking a reef updates the active sector across the linked charts.

### 2. Live and Dead Coral Cover Over Time

A D3 line chart shows yearly mean live coral and dead coral cover.

- The chart responds to sector and period filters.
- Hover interaction reveals exact yearly means and reef-year counts.
- Legend interaction allows one series to be emphasised temporarily.

### 3. Benthic Cover Indicators

A D3 stacked area chart compares yearly mean hard coral, soft coral, and algae cover.

- Users can inspect broad changes in benthic indicators over time.
- Legend selection focuses an individual layer.
- Values represent yearly means and are not constrained to sum to 100%.

### 4. Ecological Indicator Bubble Chart

A D3 bubble scatter plot supports sector-year comparison.

- X-axis: report year.
- Y-axis: selected ecological indicator.
- Colour: management sector.
- Bubble size: reef-year sample count.

Users can switch between hard coral, soft coral, and algae using the indicator selector.

### 5. Correlation Heatmap

A D3 heatmap summarises relationships among reef condition and disturbance indicators.

- Cell colour encodes Pearson correlation coefficient.
- Hover interaction shows detailed statistics.
- Clicking a cell updates an explanation panel with Pearson r, Spearman rho, complete-case count, and interpretation.

---

## Core Features

- Interactive single-page narrative dashboard.
- Linked spatial and statistical visualisations.
- Shared sector, period, and indicator controls.
- Leaflet map with OpenStreetMap tiles and CAPAD GeoJSON overlay.
- D3 line, stacked area, bubble, and heatmap visualisations.
- Base-path-aware loading for GitHub Pages deployment.
- Responsive layout for desktop and smaller screens.
- Boundary-safe tooltips that remain inside chart containers.
- Precomputed correlation matrix for fast and deterministic rendering.
- Simplified GeoJSON for improved browser performance.
- Automated GitHub Pages deployment through GitHub Actions.

---

## Interaction Guide

| Control or action | Effect |
|---|---|
| **Sector dropdown** | Filters the line, area, and bubble charts and highlights matching reef markers. |
| **Period buttons** | Restrict the visible year range to all years or a selected period. |
| **Indicator dropdown** | Changes the ecological indicator shown in the bubble chart. |
| **Hover a reef marker** | Shows reef metadata and protected-area context. |
| **Click a reef marker** | Updates the shared sector selection across the dashboard. |
| **Show all sectors** | Resets the sector filter. |
| **Hover a chart** | Shows the underlying year, mean, count, or correlation values. |
| **Click a line or area legend item** | Focuses a series or layer; clicking again resets the view. |
| **Click a heatmap cell** | Updates the detailed relationship explanation panel. |

---

## Data Sources

The project uses processed data derived from the following sources:

- **Australian Institute of Marine Science Long-Term Monitoring Program** — reef condition, disturbance indicators, and reef coordinates.
- **MMP Coral 2024** — supplementary recent coral context.
- **CAPAD Marine 2024** — marine protected-area boundaries from the Collaborative Australian Protected Areas Database.

The frontend expects these files under `public/data/`:

| File | Purpose |
|---|---|
| `aims_longterm_master_with_spatial.csv` | Reef-year monitoring records joined to spatial context. |
| `reef_points.csv` | Reef coordinates used by the Leaflet map. |
| `reef_spatial_context.csv` | Sector, shelf, and protected-area attributes for each reef. |
| `correlation_matrix_long.csv` | Precomputed Pearson and Spearman correlation results. |
| `capad_gbr_simplified.geojson` | Simplified protected-area polygons for the Great Barrier Reef region. |

The processed files were produced during the upstream Data Exploration Project. The original CAPAD geometry was simplified before use so that the public dashboard remains lightweight and responsive.

---

## Repository Structure

```plaintext
.
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages build and deployment workflow
├── index.html                      # Single-page narrative layout
├── package.json                    # Dependencies and npm scripts
├── package-lock.json               # Reproducible dependency versions
├── vite.config.js                  # Vite and GitHub Pages base-path configuration
├── public/
│   ├── data/                       # CSV and GeoJSON data files
│   └── pics/                       # Static project images
└── src/
    ├── main.js                     # Application bootstrap and central dispatch loop
    ├── dataloader.js               # Data loading, parsing, and normalisation
    ├── state.js                    # Shared dashboard state and control definitions
    ├── utils.js                    # Filtering, formatting, and reusable helpers
    ├── interaction/
    │   └── filters.js              # Sector, period, and indicator controls
    ├── viz/
    │   ├── ReefMap.js              # Leaflet reef map
    │   ├── OverallTimeTrend.js     # Live and dead coral line chart
    │   ├── BenthicComposition.js   # Benthic stacked area chart
    │   ├── EcologicalIndicator.js  # Sector-year bubble chart
    │   └── CorrelationHeatmap.js   # Correlation heatmap and explanation panel
    └── styles/
        └── style.css               # Layout, typography, chart, and responsive styles
```

---

## Local Setup

### Prerequisites

- Node.js 18 or newer.
- npm, which is included with Node.js.
- A modern web browser.

Clone the repository:

```bash
git clone https://github.com/Oatsinthepine/Coral-Reef-Health-Monitoring.git
cd Coral-Reef-Health-Monitoring
```

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open the URL printed by Vite, normally:

```plaintext
http://localhost:5173
```

---

## Production Build

Create a production build:

```bash
npm run build
```

Preview the generated site locally:

```bash
npm run preview
```

The production output is written to:

```plaintext
dist/
```

The repository uses a Vite base path of:

```plaintext
/Coral-Reef-Health-Monitoring/
```

Local data and image paths use Vite's base-path support so that the application works both locally and on GitHub Pages.

---

## GitHub Pages Deployment

Deployment is automated through `.github/workflows/deploy.yml`.

Each push to the `main` branch triggers the following workflow:

```plaintext
Checkout repository
        |
        v
Install Node.js and npm dependencies
        |
        v
Run npm run build
        |
        v
Upload dist/ as a GitHub Pages artifact
        |
        v
Deploy to GitHub Pages
```

The deployed site is available at:

https://oatsinthepine.github.io/Coral-Reef-Health-Monitoring/

---

## Design and Implementation Decisions

- The dashboard uses a guided top-to-bottom structure while preserving exploratory controls.
- Leaflet was selected for the geographic view because it provides reliable projection, pan, zoom, and GeoJSON support.
- D3.js was used for the statistical views because it provides direct control over data joins, scales, axes, marks, and interaction behaviour.
- Shared state coordinates sector, period, and indicator selections across the dashboard.
- The correlation matrix is precomputed rather than recalculated in the browser, which improves performance and reproducibility.
- CAPAD geometry is simplified before frontend use to reduce network and rendering cost.
- Protected-area status is presented as spatial context rather than evidence of management effectiveness.

---

## Limitations

- Benthic cover indicators are available for only a subset of reef-year records.
- Missing observations are excluded from calculations that require those variables.
- Correlation indicates statistical association and does not imply causation.
- Protected-area status is contextual and is not used to estimate a management effect.
- The simplified CAPAD layer is intended for visual context rather than precise spatial analysis.
- OpenStreetMap tiles require an active internet connection.
- The dashboard is an exploratory narrative visualisation rather than a causal ecological model.

---

## Portfolio Value

This project demonstrates experience in:

- translating analytical findings into an interactive data product;
- combining temporal, ecological, and geospatial datasets;
- implementing linked views with shared application state;
- building custom D3.js visualisations;
- integrating Leaflet and GeoJSON;
- optimising data assets for browser delivery;
- structuring a modular vanilla JavaScript application;
- deploying a Vite project through GitHub Actions and GitHub Pages.

---

## Author

**Ziyue Zhou**  
Master of Data Science, Monash University

This project was developed individually as part of FIT5147 Data Visualisation.
