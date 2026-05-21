import * as d3 from "d3";
import { filterMasterRows, sectorLabel } from "../utils.js";

const MARGIN = { top: 56, right: 28, bottom: 48, left: 56 };
const CHART_HEIGHT = 420;

const LAYERS = [
  { key: "hard_coral_cover", label: "Hard coral", color: "#0d6e8c" },
  { key: "soft_coral_cover", label: "Soft coral", color: "#7b6fa8" },
  { key: "algae_cover", label: "Algae", color: "#5a9a4e" },
];

/** Module state (legend focus is local; also mirrored to state.selectedBenthicLayer). */
const chart = {
  container: null,
  tooltip: null,
  legendFocus: null, // null | layer key
};

function hasBenthicValue(row) {
  return (
    row.hard_coral_cover != null ||
    row.soft_coral_cover != null ||
    row.algae_cover != null
  );
}

/**
 * Filter, keep rows with benthic data, group by year, aggregate means per layer.
 */
function aggregateBenthicByYear(master, state) {
  const filtered = filterMasterRows(master, state).filter(hasBenthicValue);
  const byYear = d3.group(filtered, (d) => d.REPORT_YEAR);

  const rows = [];
  for (const [year, yearRows] of byYear) {
    if (year == null) continue;

    const meanField = (field) => {
      const vals = yearRows.map((r) => r[field]).filter((v) => v != null);
      return vals.length ? d3.mean(vals) : null;
    };

    rows.push({
      year,
      hard_coral_cover: meanField("hard_coral_cover"),
      soft_coral_cover: meanField("soft_coral_cover"),
      algae_cover: meanField("algae_cover"),
      count: yearRows.length,
    });
  }

  return rows.sort((a, b) => a.year - b.year);
}

function sectorSubtitle(state) {
  if (state.selectedSector === "All") return "All sectors";
  return `Sector: ${state.selectedSector}`;
}

function formatPct(value) {
  return value == null ? "—" : `${d3.format(".1f")(value)}%`;
}

function nearestYear(series, xScale, mouseX) {
  if (!series.length) return null;
  const yearAtMouse = xScale.invert(mouseX);
  return series.reduce((best, d) =>
    Math.abs(d.year - yearAtMouse) < Math.abs(best.year - yearAtMouse) ? d : best
  );
}

function showTooltip(tooltip, containerNode, event, row, state) {
  const sectorText =
    state.selectedSector === "All"
      ? "All sectors"
      : `${state.selectedSector} — ${sectorLabel(state.selectedSector)}`;

  const [px, py] = d3.pointer(event, containerNode);
  const padding = 12;
  const offset = 14;

  tooltip.style("opacity", 1).html(
    `<strong>Year ${row.year}</strong><br/>` +
      `Hard coral: ${formatPct(row.hard_coral_cover)}<br/>` +
      `Soft coral: ${formatPct(row.soft_coral_cover)}<br/>` +
      `Algae: ${formatPct(row.algae_cover)}<br/>` +
      `Reef-year count: ${row.count}<br/>` +
      `Selected sector: ${sectorText}`
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

function layerOpacity(layerKey) {
  if (!chart.legendFocus) return 0.82;
  return chart.legendFocus === layerKey ? 0.92 : 0.18;
}

function stackedTotal(row) {
  return (
    (row.hard_coral_cover ?? 0) +
    (row.soft_coral_cover ?? 0) +
    (row.algae_cover ?? 0)
  );
}

export function init(containerSelector, data, state, dispatch) {
  chart.container = d3.select(containerSelector);
  chart.container.selectAll("*").remove();
  chart.container.classed("chart-container--has-chart", true);
  chart.container.attr("aria-busy", "false");

  chart.tooltip = chart.container
    .append("div")
    .attr("class", "chart-tooltip benthic-tooltip")
    .style("opacity", 0);
}

export function update(data, state) {
  if (!chart.container) return;

  const series = aggregateBenthicByYear(data.master, state);
  chart.container.select("svg").remove();

  const containerWidth = chart.container.node()?.clientWidth || 600;
  const width = Math.max(400, containerWidth);
  const height = CHART_HEIGHT;
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const svg = chart.container
    .append("svg")
    .attr("class", "benthic-chart-svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr(
      "aria-label",
      `Stacked area chart of benthic cover indicators, ${sectorSubtitle(state)}`
    );

  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", MARGIN.left)
    .attr("y", 22)
    .text("Benthic cover indicators over time");

  svg
    .append("text")
    .attr("class", "chart-subtitle")
    .attr("x", MARGIN.left)
    .attr("y", 40)
    .text(sectorSubtitle(state));

  const g = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  if (series.length === 0) {
    g.append("text")
      .attr("class", "chart-empty-message")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .text("No benthic cover data for the selected sector and period.");
    return;
  }

  const x = d3
    .scaleLinear()
    .domain(d3.extent(series, (d) => d.year))
    .range([0, innerWidth]);

  const yMax = d3.max(series, stackedTotal) ?? 0;

  const y = d3
    .scaleLinear()
    .domain([0, Math.max(yMax * 1.08, 10)])
    .nice()
    .range([innerHeight, 0]);

  // —— Axes ——
  g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .tickFormat(d3.format("d"))
        .ticks(Math.min(series.length, 10))
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
    .text("Stacked mean cover (%)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Report year");

  // —— Stacked areas (null means → 0 for stack only) ——
  const stack = d3
    .stack()
    .keys(LAYERS.map((l) => l.key))
    .value((d, key) => d[key] ?? 0)
    .offset(d3.stackOffsetNone);

  const stackedSeries = stack(series);

  const area = d3
    .area()
    .curve(d3.curveMonotoneX)
    .x((d) => x(d.data.year))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]));

  const layerColor = Object.fromEntries(LAYERS.map((l) => [l.key, l.color]));

  g.selectAll(".benthic-area")
    .data(stackedSeries)
    .join("path")
    .attr("class", (d) => `benthic-area benthic-area--${d.key}`)
    .attr("fill", (d) => layerColor[d.key])
    .attr("opacity", (d) => layerOpacity(d.key))
    .attr("d", area);

  // Top edge strokes for readability
  g.selectAll(".benthic-area-line")
    .data(stackedSeries)
    .join("path")
    .attr("class", (d) => `benthic-area-line benthic-area-line--${d.key}`)
    .attr("fill", "none")
    .attr("stroke", (d) => layerColor[d.key])
    .attr("stroke-width", 1.5)
    .attr("opacity", (d) => (chart.legendFocus && chart.legendFocus !== d.key ? 0.25 : 0.9))
    .attr(
      "d",
      d3
        .line()
        .curve(d3.curveMonotoneX)
        .x((d) => x(d.data.year))
        .y((d) => y(d[1]))
    );

  // —— Hover layer ——
  const hoverG = g.append("g").attr("class", "benthic-hover-layer");

  const guideLine = hoverG
    .append("line")
    .attr("class", "benthic-guide-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .style("opacity", 0);

  const overlay = hoverG
    .append("rect")
    .attr("class", "benthic-overlay")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .style("cursor", "crosshair");

  overlay
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const row = nearestYear(series, x, mx);
      if (!row) return;

      guideLine
        .attr("x1", x(row.year))
        .attr("x2", x(row.year))
        .style("opacity", 1);

      showTooltip(chart.tooltip, chart.container.node(), event, row, state);
    })
    .on("mouseleave", () => {
      guideLine.style("opacity", 0);
      hideTooltip(chart.tooltip);
    });

  // —— Legend ——
  const legend = svg
    .append("g")
    .attr("class", "benthic-legend")
    .attr("transform", `translate(${width - MARGIN.right - 118}, 18)`);

  const legendRow = legend
    .selectAll(".benthic-legend-item")
    .data(LAYERS)
    .join("g")
    .attr("class", (d) =>
      [
        "benthic-legend-item",
        chart.legendFocus && chart.legendFocus !== d.key
          ? "benthic-legend-item--inactive"
          : "",
      ].join(" ")
    )
    .attr("transform", (_, i) => `translate(0, ${i * 22})`)
    .style("cursor", "pointer");

  legendRow
    .append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("y", -11)
    .attr("fill", (d) => d.color);

  legendRow
    .append("text")
    .attr("x", 20)
    .attr("y", 0)
    .text((d) => d.label);

  legendRow.on("click", (_, d) => {
    chart.legendFocus = chart.legendFocus === d.key ? null : d.key;
    state.selectedBenthicLayer = chart.legendFocus;
    update(data, state);
  });
}
