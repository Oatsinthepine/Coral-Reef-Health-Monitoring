import { loadAllData, logDataSummary } from "./dataloader.js";
import { createInitialState } from "./state.js";
import * as ReefMap from "./viz/ReefMap.js";
import * as OverallTimeTrend from "./viz/OverallTimeTrend.js";
import * as BenthicComposition from "./viz/BenthicComposition.js";
import * as EcologicalIndicator from "./viz/EcologicalIndicator.js";
import * as CorrelationHeatmap from "./viz/CorrelationHeatmap.js";

const statusEl = document.getElementById("load-status");

function setStatus(message, variant = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "load-status";
  if (variant) statusEl.classList.add(`load-status--${variant}`);
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

    // Chart stubs — wired for Phase 0; containers added in Phase 2
    const charts = [
      ReefMap,
      OverallTimeTrend,
      BenthicComposition,
      EcologicalIndicator,
      CorrelationHeatmap,
    ];

    for (const chart of charts) {
      if (typeof chart.init === "function") {
        chart.init(null, data, state, dispatch);
      }
    }

    setStatus(
      `Data ready: ${summary.masterRows} reef-year records, ${summary.reefPoints} reef locations, years ${summary.yearRange[0]}–${summary.yearRange[1]}. See browser console for details.`,
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
