import { PERIOD_DEFINITIONS, INDICATOR_DEFINITIONS } from "../state.js";
import { sectorLabel } from "../utils.js";

/**
 * Build and wire dashboard controls; mutates state and calls dispatch on change.
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

  const sectors = [
    ...new Set(data.master.map((r) => r.SECTOR).filter(Boolean)),
  ].sort();

  sectorEl.innerHTML = "";
  periodEl.innerHTML = "";
  indicatorEl.innerHTML = "";

  sectorEl.classList.remove("control-slot");
  periodEl.classList.remove("control-slot", "control-slot--buttons");
  indicatorEl.classList.remove("control-slot");

  // —— Sector select ——
  const sectorSelect = document.createElement("select");
  sectorSelect.id = "sector-select";
  sectorSelect.className = "control-select";
  sectorSelect.setAttribute("aria-label", "Select sector");

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
  sectorSelect.addEventListener("change", () => {
    state.selectedSector = sectorSelect.value;
    dispatch("sectorChange", { sector: state.selectedSector });
  });

  sectorEl.appendChild(sectorSelect);

  // —— Period buttons ——
  periodEl.className = "period-buttons";
  periodEl.setAttribute("role", "group");
  periodEl.setAttribute("aria-label", "Select period");

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

  // —— Indicator select ——
  const indicatorSelect = document.createElement("select");
  indicatorSelect.id = "indicator-select";
  indicatorSelect.className = "control-select";
  indicatorSelect.setAttribute("aria-label", "Select ecological indicator");

  for (const [key, label] of Object.entries(INDICATOR_DEFINITIONS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    indicatorSelect.appendChild(opt);
  }

  indicatorSelect.value = state.selectedIndicator;
  indicatorSelect.addEventListener("change", () => {
    state.selectedIndicator = indicatorSelect.value;
    dispatch("indicatorChange", { indicator: state.selectedIndicator });
  });

  indicatorEl.appendChild(indicatorSelect);
}
