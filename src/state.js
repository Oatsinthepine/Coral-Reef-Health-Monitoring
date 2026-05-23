/*
This file defines all project's shared application state and filter definitions.
controls mutate this object in place, charts read it on each update()
*/

export const PERIOD_DEFINITIONS = {
  All: [1993, 2023],
  "1993–2005": [1993, 2005],
  "2006–2015": [2006, 2015],
  "2016–2023": [2016, 2023],
};

// THis is the indicator field keys of the ecological indicator chart
export const INDICATOR_DEFINITIONS = {
  hard_coral_cover: "Hard coral",
  soft_coral_cover: "Soft coral",
  algae_cover: "Algae",
};

// create the default shared filter state passed to all chart modules
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
