import * as d3 from "d3";
import { parseBoolean, parseNumber } from "./utils.js";

const DATA_PATHS = {
  master: "/data/aims_longterm_master_with_spatial.csv",
  reefPoints: "/data/reef_points.csv",
  spatialContext: "/data/reef_spatial_context.csv",
  correlationMatrix: "/data/correlation_matrix_long.csv",
  capadGbr: "/data/capad_gbr_simplified.geojson",
};

/** Numeric fields on the master reef-year table. */
const MASTER_NUMERIC = [
  "YEAR_CODE",
  "REPORT_YEAR",
  "LATITUDE",
  "LONGITUDE",
  "mean_live_coral",
  "mean_dead_coral",
  "mean_cots_per_tow",
  "hard_coral_cover",
  "soft_coral_cover",
  "algae_cover",
  "site_count",
  "capad_match_count",
];

function normalizeMasterRow(row) {
  const out = { ...row };

  for (const key of MASTER_NUMERIC) {
    out[key] = parseNumber(row[key]);
  }

  out.in_marine_protected_area = parseBoolean(row.in_marine_protected_area);

  // String fields kept as-is (trimmed where useful)
  out.REEF_ID = String(row.REEF_ID ?? "").trim();
  out.REEF_NAME = String(row.REEF_NAME ?? "").trim();
  out.SECTOR = String(row.SECTOR ?? "").trim();
  out.SHELF = String(row.SHELF ?? "").trim();
  out.capad_name = String(row.capad_name ?? "").trim() || null;
  out.capad_iucn = String(row.capad_iucn ?? "").trim() || null;
  out.capad_type = String(row.capad_type ?? "").trim() || null;

  return out;
}

function normalizeReefPointRow(row) {
  return {
    REEF_ID: String(row.REEF_ID ?? "").trim(),
    REEF_NAME: String(row.REEF_NAME ?? "").trim(),
    SECTOR: String(row.SECTOR ?? "").trim(),
    SHELF: String(row.SHELF ?? "").trim(),
    LATITUDE: parseNumber(row.LATITUDE),
    LONGITUDE: parseNumber(row.LONGITUDE),
  };
}

function normalizeSpatialContextRow(row) {
  return {
    REEF_ID: String(row.REEF_ID ?? "").trim(),
    REEF_NAME: String(row.REEF_NAME ?? "").trim(),
    SECTOR: String(row.SECTOR ?? "").trim(),
    SHELF: String(row.SHELF ?? "").trim(),
    LATITUDE: parseNumber(row.LATITUDE),
    LONGITUDE: parseNumber(row.LONGITUDE),
    in_marine_protected_area: parseBoolean(row.in_marine_protected_area),
    capad_name: String(row.capad_name ?? "").trim() || null,
    capad_iucn: String(row.capad_iucn ?? "").trim() || null,
    capad_type: String(row.capad_type ?? "").trim() || null,
    capad_match_count: parseNumber(row.capad_match_count),
  };
}

function normalizeCorrelationMatrixRow(row) {
  const interpretation = String(row.interpretation ?? "").trim();

  return {
    row_var: String(row.row_var ?? "").trim(),
    col_var: String(row.col_var ?? "").trim(),
    row_label: String(row.row_label ?? "").trim(),
    col_label: String(row.col_label ?? "").trim(),
    pearson_r: parseNumber(row.pearson_r),
    spearman_r: parseNumber(row.spearman_r),
    n_complete: parseNumber(row.n_complete),
    row_order: parseNumber(row.row_order),
    col_order: parseNumber(row.col_order),
    interpretation:
      interpretation ||
      "Correlation indicates association, not causation.",
  };
}

function countMissing(rows, field) {
  return rows.filter((r) => r[field] === null).length;
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map((r) => r[field]).filter(Boolean))].sort();
}

/**
 * Load optional JSON/GeoJSON; warn and return null on failure.
 * @param {string} path
 * @param {string} label
 */
export async function loadOptionalJson(path, label) {
  try {
    const data = await d3.json(path);
    if (data == null) {
      console.warn(`[Coral DVP] Optional layer not loaded (${label}): empty response`);
      return null;
    }
    return data;
  } catch (err) {
    console.warn(
      `[Coral DVP] Optional layer not loaded (${label}): ${err.message}`
    );
    return null;
  }
}

/**
 * Load and normalise primary CSV datasets plus optional CAPAD GeoJSON.
 */
export async function loadAllData() {
  const [masterRaw, reefPointsRaw, spatialContextRaw, correlationMatrixRaw] =
    await Promise.all([
      d3.csv(DATA_PATHS.master),
      d3.csv(DATA_PATHS.reefPoints),
      d3.csv(DATA_PATHS.spatialContext),
      d3.csv(DATA_PATHS.correlationMatrix),
    ]);

  const capadGbr = await loadOptionalJson(
    DATA_PATHS.capadGbr,
    "CAPAD GBR simplified"
  );

  const master = masterRaw.map(normalizeMasterRow);
  const reefPoints = reefPointsRaw.map(normalizeReefPointRow);
  const spatialContext = spatialContextRaw.map(normalizeSpatialContextRow);
  const correlationMatrix = correlationMatrixRaw.map(normalizeCorrelationMatrixRow);

  return { master, reefPoints, spatialContext, correlationMatrix, capadGbr };
}

/** Print a concise summary to the console after load. */
export function logDataSummary(data) {
  const { master, reefPoints, spatialContext, correlationMatrix, capadGbr } =
    data;

  const years = master
    .map((r) => r.REPORT_YEAR)
    .filter((y) => y !== null);
  const yearMin = d3.min(years);
  const yearMax = d3.max(years);

  const sectors = uniqueValues(master, "SECTOR");
  const reefIds = new Set(master.map((r) => r.REEF_ID));

  const benthicComplete = master.filter(
    (r) =>
      r.hard_coral_cover !== null &&
      r.soft_coral_cover !== null &&
      r.algae_cover !== null
  );

  const benthicMissingAny = master.filter(
    (r) =>
      r.hard_coral_cover === null ||
      r.soft_coral_cover === null ||
      r.algae_cover === null
  ).length;

  const mpaTrue = master.filter((r) => r.in_marine_protected_area === true).length;

  const correlationVariables = new Set(
    correlationMatrix.map((r) => r.row_var).filter(Boolean)
  ).size;

  const pearsonValues = correlationMatrix
    .map((r) => r.pearson_r)
    .filter((v) => v != null);

  const pearsonMin = d3.min(pearsonValues);
  const pearsonMax = d3.max(pearsonValues);

  const capadGbrLoaded = capadGbr != null;
  const capadGbrFeatures = capadGbrLoaded
    ? (capadGbr.features?.length ?? 0)
    : 0;

  console.group("[Coral DVP] Data loaded");
  console.table({
    masterRows: master.length,
    reefPoints: reefPoints.length,
    spatialContextRows: spatialContext.length,
    uniqueReefs: reefIds.size,
    reportYears: `${yearMin}–${yearMax}`,
    sectors: sectors.length,
    benthicCompleteRows: benthicComplete.length,
    mpaRecordsTrue: mpaTrue,
    correlationMatrixRows: correlationMatrix.length,
    correlationVariables,
    pearsonRMin: pearsonMin,
    pearsonRMax: pearsonMax,
    capadGbrLoaded,
    capadGbrFeatures,
  });
  console.log("Sectors:", sectors.join(", "));
  console.log("Missing benthic (any of 3 cols):", benthicMissingAny);
  console.groupEnd();

  return {
    masterRows: master.length,
    reefPoints: reefPoints.length,
    yearRange: [yearMin, yearMax],
    sectors,
    benthicCompleteRows: benthicComplete.length,
    correlationMatrixRows: correlationMatrix.length,
    correlationVariables,
    pearsonRRange: [pearsonMin, pearsonMax],
    capadGbrLoaded,
    capadGbrFeatures,
  };
}
