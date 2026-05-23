/*
This file is the global dashboard controls: sector, period, and indicator selectors.
Each control mutates the shared state object and calls dispatch() so all linked charts re-render via main.js → updateAllCharts().
*/

import { PERIOD_DEFINITIONS, INDICATOR_DEFINITIONS } from "../state.js";
import { sectorLabel } from "../utils.js";

/**
 Here we build sector dropdown, period buttons, and indicator select; wire change handlers.
 * @param {{ data: object, state: object, dispatch: function }} options
 */
export function initControls({ data, state, dispatch }) {
  const sectorEl = document.getElementById("sector-control");
  const periodEl = document.getElementById("period-control");
  const indicatorEl = document.getElementById("indicator-control");

  if (!sectorEl || !periodEl || !indicatorEl) {
    console.warn("[filters] Control containers not found");
    return;
  }

  // Sector options derived from loaded master data
  const sectors = [
    ...new Set(data.master.map((r) => r.SECTOR).filter(Boolean)),
  ].sort();

  sectorEl.innerHTML = "";
  periodEl.innerHTML = "";
  indicatorEl.innerHTML = "";

  sectorEl.classList.remove("control-slot");
  periodEl.classList.remove("control-slot", "control-slot--buttons");
  indicatorEl.classList.remove("control-slot");

  // here are all the Sector select
  const sectorSelect = document.createElement("select");
  sectorSelect.id = "sector-select";
  sectorSelect.className = "control-select";
  sectorSelect.setAttribute("aria-labelledby", "sector-label");

  const allSectorOpt = document.createElement("option");
  allSectorOpt.value = "All";
  allSectorOpt.textContent = "All sectors";
  sectorSelect.appendChild(allSectorOpt);

  for (const code of sectors) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${code} — ${sectorLabel(code)}`;
    sectorSelect.appendChild(opt);
  }

  sectorSelect.value = state.selectedSector;
  // wire the change handler to the sector select
  sectorSelect.addEventListener("change", () => {
    state.selectedSector = sectorSelect.value;
    dispatch("sectorChange", { sector: state.selectedSector });
  });

  sectorEl.appendChild(sectorSelect);


  periodEl.className = "period-buttons";
  periodEl.setAttribute("role", "group");
  periodEl.setAttribute("aria-labelledby", "period-label");

  const periodLabels = Object.keys(PERIOD_DEFINITIONS);

  for (const label of periodLabels) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "period-btn";
    btn.dataset.period = label;
    btn.textContent = label;
    if (label === state.selectedPeriod) {
      btn.classList.add("period-btn--active");
      btn.setAttribute("aria-pressed", "true");
    } else {
      btn.setAttribute("aria-pressed", "false");
    }

    // wire the change handler to the period buttons
    btn.addEventListener("click", () => {
      state.selectedPeriod = label;
      state.selectedYearRange = [...PERIOD_DEFINITIONS[label]];

      periodEl.querySelectorAll(".period-btn").forEach((b) => {
        const active = b.dataset.period === label;
        b.classList.toggle("period-btn--active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      dispatch("periodChange", {
        period: state.selectedPeriod,
        yearRange: state.selectedYearRange,
      });
    });

    periodEl.appendChild(btn);
  }

  // here are all the indicator selects
  const indicatorSelect = document.createElement("select");
  indicatorSelect.id = "indicator-select";
  indicatorSelect.className = "control-select";
  indicatorSelect.setAttribute("aria-labelledby", "indicator-label");

  for (const [key, label] of Object.entries(INDICATOR_DEFINITIONS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    indicatorSelect.appendChild(opt);
  }

  indicatorSelect.value = state.selectedIndicator;

  // wire the change handler to the indicator select
  indicatorSelect.addEventListener("change", () => {
    state.selectedIndicator = indicatorSelect.value;
    dispatch("indicatorChange", { indicator: state.selectedIndicator });
  });

  indicatorEl.appendChild(indicatorSelect);
}

/**
 sync the control DOM to the shared state after non-control interactions (e.g. map click).
 * @param {object} state - shared appState
 */
export function syncControlsFromState(state) {
  const sectorSelect = document.getElementById("sector-select");
  if (sectorSelect && sectorSelect.value !== state.selectedSector) {
    sectorSelect.value = state.selectedSector;
  }

  const indicatorSelect = document.getElementById("indicator-select");
  if (indicatorSelect && indicatorSelect.value !== state.selectedIndicator) {
    indicatorSelect.value = state.selectedIndicator;
  }

  document.querySelectorAll(".period-btn").forEach((btn) => {
    const active = btn.dataset.period === state.selectedPeriod;
    btn.classList.toggle("period-btn--active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
