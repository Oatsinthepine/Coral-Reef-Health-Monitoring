# Australian Coral Reef Health Monitoring (FIT5147 DVP)

Single-page interactive narrative visualisation of long-term Great Barrier Reef monitoring data (HTML, CSS, vanilla JS, D3.js, Vite).

## Prerequisites

- Node.js 18+
- Data files in `public/data/` (see AGENTS.md)

## Setup

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Data

Primary CSVs (required):

- `public/data/aims_longterm_master_with_spatial.csv`
- `public/data/reef_points.csv`
- `public/data/reef_spatial_context.csv`

Place these files locally before running; they may be gitignored in this repo.
