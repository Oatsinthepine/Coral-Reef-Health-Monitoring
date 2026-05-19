/** Period presets: label → [startYear, endYear] */
export const PERIOD_DEFINITIONS = {
  All: [1993, 2023],
  "1993–2005": [1993, 2005],
  "2006–2015": [2006, 2015],
  "2016–2023": [2016, 2023],
};

/** Indicator field keys → display labels */
export const INDICATOR_DEFINITIONS = {
  hard_coral_cover: "Hard coral",
  soft_coral_cover: "Soft coral",
  algae_cover: "Algae",
};

/** Default shared application state. */
export function createInitialState() {
  return {
    selectedSector: "All",
    selectedPeriod: "All",
    selectedYearRange: [...PERIOD_DEFINITIONS.All],
    selectedIndicator: "hard_coral_cover",
    selectedBenthicLayer: null,
    selectedHeatmapCell: null,
  };
}
