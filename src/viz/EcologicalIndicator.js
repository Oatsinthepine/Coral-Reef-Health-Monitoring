/*
This js file if for plotting graph 4 — Ecological indicator bubble scatter by sector and year.
encodings: x = year, y = mean cover, colour = sector, radius = reef-year count.
*/

import * as d3 from "d3";
import { INDICATOR_DEFINITIONS } from "../state.js";
import { filterByYearRange, sectorLabel } from "../utils.js";

const MARGIN = { top: 68, right: 24, bottom: 96, left: 56 };
const CHART_HEIGHT = 440;

// set stable categorical colours for GBR management sector
const SECTOR_COLORS = {
  CA: "#4e79a7",
  CB: "#f28e2b",
  CG: "#e15759",
  CL: "#76b7b2",
  CU: "#59a14f",
  IN: "#edc948",
  PC: "#b07aa1",
  PO: "#ff9da7",
  SW: "#9c755f",
  TO: "#bab0ac",
  WH: "#86bcb6",
};

const Y_AXIS_LABELS = {
  hard_coral_cover: "Mean hard coral cover (%)",
  soft_coral_cover: "Mean soft coral cover (%)",
  algae_cover: "Mean algae cover (%)",
};

const chart = {
  container: null,
  tooltip: null,
};

function indicatorLabel(key) {
  return INDICATOR_DEFINITIONS[key] ?? key;
}

function chartTitle(state) {
  return `${indicatorLabel(state.selectedIndicator)} cover over time by sector`;
}

function chartSubtitle(state) {
  if (state.selectedSector === "All") return "All sectors";
  return `Highlighted sector: ${state.selectedSector}`;
}

function formatPct(value) {
  return value == null ? "—" : `${d3.format(".1f")(value)}%`;
}

// aggregate sector-year means for the selected indicator, this does not filter by selectedSector — all sectors remain visible.
function aggregateSectorYear(master, state) {
  const field = state.selectedIndicator;
  const filtered = filterByYearRange(master, state.selectedYearRange).filter(
    (r) =>
      r.REPORT_YEAR != null &&
      r.SECTOR &&
      r[field] != null
  );

  const rolled = d3.rollup(
    filtered,
    (rows) => ({
      meanValue: d3.mean(rows, (d) => d[field]),
      count: rows.length,
    }),
    (d) => d.SECTOR,
    (d) => d.REPORT_YEAR
  );

  const points = [];
  for (const [sector, yearMap] of rolled) {
    for (const [year, stats] of yearMap) {
      if (year == null || stats.meanValue == null) continue;
      points.push({
        sector,
        year,
        meanValue: stats.meanValue,
        count: stats.count,
      });
    }
  }

  return points.sort((a, b) => a.year - b.year || a.sector.localeCompare(b.sector));
}

// sqrt scale maps count to radius, domain clamped at p95 to limit outlier bubble size
function buildRadiusScale(points) {
  const countMin = d3.min(points, (d) => d.count);
  const countMedian = d3.median(points, (d) => d.count);
  const sortedCounts = points.map((d) => d.count).sort(d3.ascending);
  const countP95 = d3.quantile(sortedCounts, 0.95);
  const countMax = d3.max(points, (d) => d.count);

  let radius;
  if (countMin === countP95) {
    radius = () => 8;
  } else {
    radius = d3
      .scaleSqrt()
      .domain([countMin, countP95])
      .range([3.5, 18])
      .clamp(true);
  }

  return { radius, countMin, countMedian, countP95, countMax };
}

function sectorColor(sector) {
  return SECTOR_COLORS[sector] ?? "#888888";
}

function bubbleOpacity(sector, state) {
  if (state.selectedSector === "All") return 0.65;
  return sector === state.selectedSector ? 0.95 : 0.12;
}

function bubbleStroke(sector, state) {
  if (state.selectedSector !== "All" && sector === state.selectedSector) {
    return { width: 2.2, color: "#1a2b3c" };
  }
  if (state.selectedSector !== "All") {
    return { width: 0, color: "none" };
  }
  return { width: 0.6, color: "rgba(26, 43, 60, 0.22)" };
}

// ensure boundary-safe tooltip positioning
function showTooltip(tooltip, containerNode, event, point, state) {
  const [px, py] = d3.pointer(event, containerNode);
  const padding = 12;
  const offset = 14;

  tooltip.style("opacity", 1).html(
    `<strong>Year ${point.year}</strong><br/>` +
      `Sector: ${point.sector} — ${sectorLabel(point.sector)}<br/>` +
      `Indicator: ${indicatorLabel(state.selectedIndicator)}<br/>` +
      `Mean cover: ${formatPct(point.meanValue)}<br/>` +
      `Reef-year count: ${point.count}`
  );

  tooltip.style("left", `${px + offset}px`).style("top", `${py - offset}px`);

  const containerRect = containerNode.getBoundingClientRect();
  const tooltipRect = tooltip.node().getBoundingClientRect();

  let left = px + offset;
  let top = py - offset;

  if (left + tooltipRect.width + padding > containerRect.width) {
    left = px - tooltipRect.width - offset;
  }
  if (top + tooltipRect.height + padding > containerRect.height) {
    top = containerRect.height - tooltipRect.height - padding;
  }
  if (top < padding) top = padding;
  if (left < padding) left = padding;

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function hideTooltip(tooltip) {
  tooltip.style("opacity", 0);
}

// compact bubble size legend (min / median / p95)
function drawSizeLegend(g, innerWidth, innerHeight, radius, stats) {
  const { countMin, countMedian, countP95 } = stats;
  const legendWidth = 168;
  const legendX = innerWidth - legendWidth;

  const sizeLegend = g
    .append("g")
    .attr("class", "indicator-size-legend")
    .attr("transform", `translate(${legendX}, ${innerHeight + 50})`);

  sizeLegend
    .append("text")
    .attr("class", "indicator-size-legend-title")
    .attr("x", 0)
    .attr("y", 0)
    .text("Bubble size = reef-year count");

  const items = [
    { label: "min", value: countMin },
    { label: "median", value: countMedian },
    { label: "p95", value: countP95 },
  ];

  const item = sizeLegend
    .selectAll(".indicator-size-legend-item")
    .data(items)
    .join("g")
    .attr("class", "indicator-size-legend-item")
    .attr("transform", (_, i) => `translate(${i * 54 + 14}, 22)`);

  item
    .append("circle")
    .attr("class", "indicator-size-legend-circle")
    .attr("cy", 0)
    .attr("r", (d) => radius(d.value))
    .attr("fill", "#5a6b7d")
    .attr("fill-opacity", 0.35)
    .attr("stroke", "#5a6b7d")
    .attr("stroke-width", 0.75);

  item
    .append("text")
    .attr("class", "indicator-size-legend-value")
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .text((d) => d.value);

  item
    .append("text")
    .attr("class", "indicator-size-legend-label")
    .attr("y", 34)
    .attr("text-anchor", "middle")
    .text((d) => d.label);
}

/**
Here I create tooltip container.
@param {string} containerSelector
@param {object} data - appData
@param {object} state - shared appState
@param {function} dispatch - unused; kept for consistent chart API
*/
export function init(containerSelector, data, state, dispatch) {
  chart.container = d3.select(containerSelector);
  chart.container.selectAll("*").remove();
  chart.container.classed("chart-container--has-chart", true);
  chart.container.attr("aria-busy", "false");

  chart.tooltip = chart.container
    .append("div")
    .attr("class", "chart-tooltip indicator-tooltip")
    .style("opacity", 0);
}

// redraw bubbles for the selected indicator and period
export function update(data, state) {
  if (!chart.container) return;

  const points = aggregateSectorYear(data.master, state);
  chart.container.select("svg").remove();

  const containerWidth = chart.container.node()?.clientWidth || 600;
  const width = Math.max(400, containerWidth);
  const height = CHART_HEIGHT;
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const svg = chart.container
    .append("svg")
    .attr("class", "indicator-chart-svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `${chartTitle(state)}, ${chartSubtitle(state)}`);

  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", MARGIN.left)
    .attr("y", 22)
    .text(chartTitle(state));

  svg
    .append("text")
    .attr("class", "chart-subtitle")
    .attr("x", MARGIN.left)
    .attr("y", 40)
    .text(chartSubtitle(state));

  svg
    .append("text")
    .attr("class", "indicator-legend-note")
    .attr("x", MARGIN.left)
    .attr("y", 54)
    .text("Colour indicates sector. Use the sector dropdown above to highlight one sector.");

  const g = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  if (points.length === 0) {
    g.append("text")
      .attr("class", "chart-empty-message")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .text("No indicator data for the selected period and measure.");
    return;
  }

  const countStats = buildRadiusScale(points);
  const { radius } = countStats;

  // Small horizontal dodge by sector reduces overplotting at the same year.
  const sectorsInView = [...new Set(points.map((d) => d.sector))].sort();
  const sectorOffset = d3.scalePoint().domain(sectorsInView).range([-8, 8]);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(points, (d) => d.year))
    .range([0, innerWidth]);

  const bubbleX = (d) => x(d.year) + (sectorOffset(d.sector) ?? 0);

  const yMax = d3.max(points, (d) => d.meanValue) ?? 0;

  const y = d3
    .scaleLinear()
    .domain([0, Math.max(yMax * 1.08, 5)])
    .nice()
    .range([innerHeight, 0]);

  // axes
  g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .tickFormat(d3.format("d"))
        .ticks(Math.min(new Set(points.map((d) => d.year)).size, 10))
    );

  g.append("g")
    .attr("class", "axis axis--y")
    .call(d3.axisLeft(y).ticks(6));

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -44)
    .attr("text-anchor", "middle")
    .text(Y_AXIS_LABELS[state.selectedIndicator] ?? "Mean cover (%)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Report year");

  // Trend line connects the highlighted sector's bubbles when one sector is selected.
  if (state.selectedSector !== "All") {
    const trendPoints = points
      .filter((d) => d.sector === state.selectedSector)
      .sort((a, b) => a.year - b.year);

    if (trendPoints.length > 1) {
      const line = d3
        .line()
        .x((d) => bubbleX(d))
        .y((d) => y(d.meanValue));

      g.append("path")
        .datum(trendPoints)
        .attr("class", "indicator-trend-line")
        .attr("fill", "none")
        .attr("stroke", sectorColor(state.selectedSector))
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.85)
        .attr("d", line);
    }
  }

  // draw the bubbles
  const bubbles = g
    .selectAll(".indicator-bubble")
    .data(points)
    .join("circle")
    .attr("class", "indicator-bubble")
    .attr("cx", (d) => bubbleX(d))
    .attr("cy", (d) => y(d.meanValue))
    .attr("r", (d) => radius(d.count))
    .attr("fill", (d) => sectorColor(d.sector))
    .attr("fill-opacity", (d) => bubbleOpacity(d.sector, state))
    .attr("stroke", (d) => bubbleStroke(d.sector, state).color)
    .attr("stroke-width", (d) => bubbleStroke(d.sector, state).width)
    .style("cursor", "pointer");

  bubbles
    .on("mousemove", (event, d) => {
      showTooltip(chart.tooltip, chart.container.node(), event, d, state);
    })
    .on("mouseleave", () => {
      hideTooltip(chart.tooltip);
    });

  drawSizeLegend(g, innerWidth, innerHeight, radius, countStats);
}
