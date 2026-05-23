/*
 This file is the main entry point for the entire dashboard, it's responsible for loading the data, initializing the state, and wiring the controls to the charts.
 The data flow is as follows: load CSV/GeoJSON -> create shared state -> wire controls -> init charts -> dispatch on filter changes -> all chart modules re-read appState via update().
 */

import { loadAllData, logDataSummary } from "./dataloader.js";
import { createInitialState } from "./state.js";
import { initControls, syncControlsFromState } from "./interaction/filters.js";
import * as ReefMap from "./viz/ReefMap.js";
import * as OverallTimeTrend from "./viz/OverallTimeTrend.js";
import * as BenthicComposition from "./viz/BenthicComposition.js";
import * as EcologicalIndicator from "./viz/EcologicalIndicator.js";
import * as CorrelationHeatmap from "./viz/CorrelationHeatmap.js";

const statusEl = document.getElementById("load-status");

// register all chart modules and their DOM container selectors. 
const CHART_MODULES = [
  { module: ReefMap, selector: "#reef-map" },
  { module: OverallTimeTrend, selector: "#overall-trend" },
  { module: BenthicComposition, selector: "#benthic-composition" },
  { module: EcologicalIndicator, selector: "#ecological-indicator" },
  { module: CorrelationHeatmap, selector: "#correlation-heatmap" },
];

// loaded datasets returned by dataloader.js 
let appData = null;
// mutable filter state shared by controls and chart update() calls.
let appState = null;

function setStatus(message, variant = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "load-status";
  if (variant) statusEl.classList.add(`load-status--${variant}`);
}

function markChartContainersReady() {
  document.querySelectorAll(".chart-container").forEach((el) => {
    el.classList.add("chart-container--ready");
  });
}

// push current appState to every chart module's update(data, state)
function updateAllCharts() {
  if (!appData || !appState) return;

  for (const { module } of CHART_MODULES) {
    if (typeof module.update === "function") {
      module.update(appData, appState);
    }
  }
}

/** 
 Here is the central dispatch loop, it is responsible for syncing the control UI when the sector changes from the map, and then redrawing all linked charts.
 call dispatch() to sync the control UI when the sector changes from the map, and then redraw all linked charts.
 @param {string} event - e.g. "sectorChange", "periodChange", "indicatorChange"
 @param {object} [payload] - optional context (not used for routing)
 */
function dispatch(event, payload = {}) {
  if (event === "sectorChange" && appState) {
    syncControlsFromState(appState);
  }

  updateAllCharts();
}

/*
Here is the bootstrap sequence, it is responsible for loading the data, initialising the state, building the controls, initializing the charts,
This is called once on page load.
 */
async function bootstrap() {
  try {
    appData = await loadAllData();
    const summary = logDataSummary(appData);
    appState = createInitialState();

    initControls({ data: appData, state: appState, dispatch });

    for (const { module, selector } of CHART_MODULES) {
      if (typeof module.init === "function") {
        module.init(selector, appData, appState, dispatch);
      }
    }

    updateAllCharts();
    markChartContainersReady();

    setStatus(
      `Data ready — ${summary.masterRows.toLocaleString()} reef-year records, ${summary.reefPoints} reefs, ${summary.yearRange[0]}–${summary.yearRange[1]}.`,
      "ok"
    );
  } catch (err) {
    console.error("[Coral DVP] Failed to load data:", err);
    setStatus(
      `Failed to load data: ${err.message}. Ensure CSV files are in public/data/.`,
      "error"
    );
  }
}

bootstrap();
