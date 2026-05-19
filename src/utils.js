/** Parse a CSV cell to number, or null if empty / invalid. */
export function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Normalise True/False strings from CSV to boolean or null. */
export function parseBoolean(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
}

/** Human-readable GBR sector labels (AIMS LTMP codes). */
export const SECTOR_LABELS = {
  CA: "Cairns",
  CB: "Capricorn-Bunker",
  CG: "Cape Grenville",
  CL: "Cape Upstart / Whitsunday",
  CU: "Cumberland",
  IN: "Inner",
  PC: "Princess Charlotte Bay",
  PO: "Pompey",
  SW: "Swain",
  TO: "Torres Strait",
  WH: "Wet Tropics",
};

export function sectorLabel(code) {
  return SECTOR_LABELS[code] ?? code;
}
