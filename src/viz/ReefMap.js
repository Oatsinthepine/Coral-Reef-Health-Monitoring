import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sectorLabel } from "../utils.js";

/** Stable sector colours (matches Graph 4). */
const SECTOR_COLORS = {
  CA: "#4e79a7",
  CB: "#f28e2b",
  CG: "#e15759",
  CL: "#76b7b2",
  CU: "#59a14f",
  IN: "#edc948",
  PC: "#b07aa1",
  PO: "#ff9da7",
  SW: "#9c755f",
  TO: "#bab0ac",
  WH: "#86bcb6",
};

/** Module-local state — Leaflet map is created once and reused. */
const chart = {
  containerEl: null,
  mapEl: null,
  map: null,
  capadLayer: null,
  markersLayer: null,
  markerEntries: [], // [{ marker, reef }]
  dispatch: null,
  ready: false,
};

function sectorColor(sector) {
  return SECTOR_COLORS[sector] ?? "#888888";
}

function protectedLabel(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Unknown";
}

function fmt(n) {
  return n == null ? "—" : Number(n).toFixed(3);
}

/** Join reef points with spatial context by REEF_ID. */
function joinReefData(reefPoints, spatialContext) {
  const ctxMap = new Map((spatialContext ?? []).map((r) => [r.REEF_ID, r]));

  return (reefPoints ?? []).map((p) => {
    const ctx = ctxMap.get(p.REEF_ID);
    return {
      REEF_ID: p.REEF_ID,
      REEF_NAME: p.REEF_NAME,
      SECTOR: p.SECTOR,
      SHELF: p.SHELF,
      LATITUDE: p.LATITUDE,
      LONGITUDE: p.LONGITUDE,
      in_marine_protected_area: ctx?.in_marine_protected_area ?? false,
      capad_name: ctx?.capad_name ?? null,
      capad_type: ctx?.capad_type ?? null,
      capad_match_count: ctx?.capad_match_count ?? null,
    };
  });
}

function popupHtml(reef) {
  return (
    `<div class="reef-popup">` +
    `<strong class="reef-popup__title">${reef.REEF_NAME}</strong>` +
    `<div class="reef-popup__row"><span>Reef ID</span><span>${reef.REEF_ID}</span></div>` +
    `<div class="reef-popup__row"><span>Sector</span><span>${reef.SECTOR} — ${sectorLabel(reef.SECTOR)}</span></div>` +
    `<div class="reef-popup__row"><span>Shelf</span><span>${reef.SHELF || "—"}</span></div>` +
    `<div class="reef-popup__row"><span>Protected area</span><span>${protectedLabel(reef.in_marine_protected_area)}</span></div>` +
    `<div class="reef-popup__row"><span>CAPAD name</span><span>${reef.capad_name ?? "—"}</span></div>` +
    `<div class="reef-popup__row"><span>CAPAD type</span><span>${reef.capad_type ?? "—"}</span></div>` +
    `<div class="reef-popup__row"><span>Lat / Lon</span><span>${fmt(reef.LATITUDE)}, ${fmt(reef.LONGITUDE)}</span></div>` +
    `</div>`
  );
}

/** Style for a marker based on current selected sector. */
function markerStyle(reef, state) {
  const selected =
    state.selectedSector !== "All" && reef.SECTOR === state.selectedSector;
  const dimmed = state.selectedSector !== "All" && !selected;
  const color = sectorColor(reef.SECTOR);

  // Protected = filled with sector colour; otherwise hollow with dark outline.
  if (reef.in_marine_protected_area) {
    return {
      radius: selected ? 6 : 4.5,
      color: selected ? "#1a2b3c" : "#ffffff",
      weight: selected ? 2 : 1,
      fillColor: color,
      fillOpacity: dimmed ? 0.15 : 0.9,
      opacity: dimmed ? 0.3 : 1,
    };
  }

  return {
    radius: selected ? 6 : 4.5,
    color: selected ? "#1a2b3c" : "#1a2b3c",
    weight: selected ? 2.4 : 1.6,
    fillColor: "#ffffff",
    fillOpacity: dimmed ? 0.1 : 1,
    opacity: dimmed ? 0.25 : 1,
  };
}

function applyMarkerStyles(state) {
  for (const { marker, reef } of chart.markerEntries) {
    marker.setStyle(markerStyle(reef, state));
  }
}

/** Build the reset button and append to the chart container. */
function addResetButton(state) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "reef-map-reset-btn";
  btn.textContent = "Show all sectors";
  btn.addEventListener("click", () => {
    state.selectedSector = "All";
    if (chart.dispatch) {
      chart.dispatch("sectorChange", {
        sector: "All",
        source: "reef-map-reset",
      });
    }
  });
  chart.containerEl.appendChild(btn);
}

function addMapNote() {
  const note = document.createElement("p");
  note.className = "reef-map-note";
  note.textContent =
    "CAPAD marine protected areas shown in blue; reef points coloured by sector.";
  chart.containerEl.appendChild(note);
}

export function init(containerSelector, data, state, dispatch) {
  const containerEl = document.querySelector(containerSelector);
  if (!containerEl) {
    console.warn("[ReefMap] container not found:", containerSelector);
    return;
  }

  // Wipe any previous content (e.g. placeholder paragraph or earlier renders).
  containerEl.innerHTML = "";
  containerEl.classList.add("chart-container--has-chart", "reef-map-container");

  chart.containerEl = containerEl;
  chart.dispatch = dispatch;

  // Reset button (positioned absolutely above the map).
  addResetButton(state);

  // Map div fills the chart container.
  chart.mapEl = document.createElement("div");
  chart.mapEl.className = "reef-map-leaflet";
  containerEl.appendChild(chart.mapEl);

  // Note below the map.
  addMapNote();

  // —— Create the Leaflet map ——
  chart.map = L.map(chart.mapEl, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: false,
  });

  // CAPAD polygon layer (optional, no hover).
  if (data.capadGbr?.features?.length) {
    chart.capadLayer = L.geoJSON(data.capadGbr, {
      style: () => ({
        color: "#4e79a7",
        weight: 0.7,
        opacity: 0.7,
        fillColor: "#9ecae1",
        fillOpacity: 0.25,
      }),
      interactive: false,
    }).addTo(chart.map);
  }

  // Reef markers
  chart.markersLayer = L.layerGroup().addTo(chart.map);
  chart.markerEntries = [];

  const reefs = joinReefData(data.reefPoints, data.spatialContext).filter(
    (r) => r.LATITUDE != null && r.LONGITUDE != null
  );

  const latLngs = [];
  for (const reef of reefs) {
    const marker = L.circleMarker([reef.LATITUDE, reef.LONGITUDE], {
      ...markerStyle(reef, state),
      bubblingMouseEvents: false,
    });

    marker.bindTooltip(popupHtml(reef), {
      direction: "top",
      offset: [0, -4],
      className: "reef-map-tooltip",
      sticky: true,
    });

    marker.on("click", () => {
      state.selectedSector = reef.SECTOR;
      if (chart.dispatch) {
        chart.dispatch("sectorChange", {
          sector: reef.SECTOR,
          source: "reef-map",
        });
      }
    });

    marker.addTo(chart.markersLayer);
    chart.markerEntries.push({ marker, reef });
    latLngs.push([reef.LATITUDE, reef.LONGITUDE]);
  }

  // Fit to reef points only (per spec — not CAPAD bounds).
  if (latLngs.length > 0) {
    chart.map.fitBounds(latLngs, { padding: [20, 20] });
  } else {
    // Sensible default if no points.
    chart.map.setView([-18.5, 147], 5);
  }

  // Fix sizing if the container had 0 dimensions when the map was created
  // (e.g. inside a flex layout that resolved size later).
  requestAnimationFrame(() => {
    if (chart.map) chart.map.invalidateSize();
  });

  chart.ready = true;
}

export function update(data, state) {
  if (!chart.ready || !chart.map) return;
  applyMarkerStyles(state);
}
