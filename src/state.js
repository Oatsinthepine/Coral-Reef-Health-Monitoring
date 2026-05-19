/** Default shared application state (expanded in Phase 3). */
export function createInitialState() {
  return {
    selectedSector: "All",
    selectedPeriod: "All",
    selectedYearRange: [1993, 2023],
    selectedIndicator: "hard_coral_cover",
    selectedBenthicLayer: null,
    selectedHeatmapCell: null,
  };
}
