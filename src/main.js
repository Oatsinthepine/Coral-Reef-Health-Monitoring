import { loadAllData, logDataSummary } from "./dataloader.js";
import { createInitialState } from "./state.js";
import { initControls } from "./interaction/filters.js";
import * as ReefMap from "./viz/ReefMap.js";
import * as OverallTimeTrend from "./viz/OverallTimeTrend.js";
import * as BenthicComposition from "./viz/BenthicComposition.js";
import * as EcologicalIndicator from "./viz/EcologicalIndicator.js";
import * as CorrelationHeatmap from "./viz/CorrelationHeatmap.js";

const statusEl = document.getElementById("load-status");

/** Chart container selectors (Phase 4+ will render into these). */
const CHART_MODULES = [
  { module: ReefMap, selector: "#reef-map" },
  { module: OverallTimeTrend, selector: "#overall-trend" },
  { module: BenthicComposition, selector: "#benthic-composition" },
  { module: EcologicalIndicator, selector: "#ecological-indicator" },
  { module: CorrelationHeatmap, selector: "#correlation-heatmap" },
];

let appData = null;
let appState = null;

function setStatus(message, variant = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "load-status";
  if (variant) statusEl.classList.add(`load-status--${variant}`);
}

/** Mark chart placeholder boxes after data loads successfully. */
function markChartContainersReady() {
  document.querySelectorAll(".chart-container").forEach((el) => {
    el.classList.add("chart-container--ready");
  });
}

/** Notify all chart modules of a state change. */
function updateAllCharts() {
  if (!appData || !appState) return;

  for (const { module } of CHART_MODULES) {
    if (typeof module.update === "function") {
      module.update(appData, appState);
    }
  }
}

/**
 * Central event bus: update linked views when filters change.
 * @param {string} event
 * @param {object} [payload]
 */
function dispatch(event, payload = {}) {
  console.log("[dispatch]", event, payload, appState);
  updateAllCharts();
}

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
