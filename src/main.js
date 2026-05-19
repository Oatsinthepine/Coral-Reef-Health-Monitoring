import { loadAllData, logDataSummary } from "./dataloader.js";
import { createInitialState } from "./state.js";
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

/** Minimal dispatch stub for chart modules (Phase 3 will expand). */
function dispatch(event, payload) {
  console.debug("[dispatch]", event, payload);
}

async function bootstrap() {
  try {
    const data = await loadAllData();
    const summary = logDataSummary(data);
    const state = createInitialState();

    for (const { module, selector } of CHART_MODULES) {
      if (typeof module.init === "function") {
        module.init(selector, data, state, dispatch);
      }
    }

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
