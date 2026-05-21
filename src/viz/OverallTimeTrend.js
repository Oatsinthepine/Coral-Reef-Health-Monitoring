import * as d3 from "d3";
import { filterMasterRows, sectorLabel } from "../utils.js";

const MARGIN = { top: 56, right: 28, bottom: 48, left: 56 };
const CHART_HEIGHT = 420;

const COLORS = {
  live: "#0d6e8c",
  dead: "#c45c3e",
};

/** Module state (legend focus is local, not global app state). */
const chart = {
  container: null,
  tooltip: null,
  legendFocus: null, // null | "live" | "dead"
};

/**
 * Filter, group by year, and aggregate mean live/dead coral.
 * Excludes years where both means are null.
 */
function aggregateByYear(master, state) {
  const filtered = filterMasterRows(master, state);
  const byYear = d3.group(filtered, (d) => d.REPORT_YEAR);

  const rows = [];
  for (const [year, yearRows] of byYear) {
    if (year == null) continue;

    const liveVals = yearRows
      .map((d) => d.mean_live_coral)
      .filter((v) => v != null);
    const deadVals = yearRows
      .map((d) => d.mean_dead_coral)
      .filter((v) => v != null);

    const meanLive = liveVals.length ? d3.mean(liveVals) : null;
    const meanDead = deadVals.length ? d3.mean(deadVals) : null;

    if (meanLive == null && meanDead == null) continue;

    rows.push({
      year,
      mean_live_coral: meanLive,
      mean_dead_coral: meanDead,
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

/** Find the year row closest to the mouse x position in plot coordinates. */
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
      `Mean live coral: ${formatPct(row.mean_live_coral)}<br/>` +
      `Mean dead coral: ${formatPct(row.mean_dead_coral)}<br/>` +
      `Reef-year count: ${row.count}<br/>` +
      `Selected sector: ${sectorText}`
  );

  // Default position before measuring so getBoundingClientRect returns real size
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

  if (top < padding) {
    top = padding;
  }

  if (left < padding) {
    left = padding;
  }

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function hideTooltip(tooltip) {
  tooltip.style("opacity", 0);
}

/** Apply faded styling based on module-local legendFocus. */
function seriesOpacity(seriesKey) {
  if (!chart.legendFocus) return 1;
  return chart.legendFocus === seriesKey ? 1 : 0.2;
}

export function init(containerSelector, data, state, dispatch) {
  chart.container = d3.select(containerSelector);
  chart.container.selectAll("*").remove();
  chart.container.classed("chart-container--has-chart", true);
  chart.container.attr("aria-busy", "false");

  chart.tooltip = chart.container
    .append("div")
    .attr("class", "chart-tooltip trend-tooltip")
    .style("opacity", 0);
}

export function update(data, state) {
  if (!chart.container) return;

  const series = aggregateByYear(data.master, state);
  chart.container.select("svg").remove();

  const containerWidth = chart.container.node()?.clientWidth || 600;
  const width = Math.max(400, containerWidth);
  const height = CHART_HEIGHT;
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const svg = chart.container
    .append("svg")
    .attr("class", "trend-chart-svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr(
      "aria-label",
      `Line chart of mean live and dead coral cover, ${sectorSubtitle(state)}`
    );

  // —— Title & subtitle ——
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", MARGIN.left)
    .attr("y", 22)
    .text("Live and dead coral cover over time");

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
      .text("No data for the selected sector and period.");
    return;
  }

  const x = d3
    .scaleLinear()
    .domain(d3.extent(series, (d) => d.year))
    .range([0, innerWidth]);

  const yMax =
    d3.max(series, (d) =>
      Math.max(d.mean_live_coral ?? 0, d.mean_dead_coral ?? 0)
    ) ?? 0;

  const y = d3
    .scaleLinear()
    .domain([0, Math.max(yMax * 1.08, 5)])
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
    .text("Mean cover (%)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Report year");

  // —— Lines ——
  const lineLive = d3
    .line()
    .defined((d) => d.mean_live_coral != null)
    .x((d) => x(d.year))
    .y((d) => y(d.mean_live_coral));

  const lineDead = d3
    .line()
    .defined((d) => d.mean_dead_coral != null)
    .x((d) => x(d.year))
    .y((d) => y(d.mean_dead_coral));

  g.append("path")
    .datum(series)
    .attr("class", "trend-line trend-line--dead")
    .attr("fill", "none")
    .attr("stroke", COLORS.dead)
    .attr("stroke-width", 2.5)
    .attr("opacity", seriesOpacity("dead"))
    .attr("d", lineDead);

  g.append("path")
    .datum(series)
    .attr("class", "trend-line trend-line--live")
    .attr("fill", "none")
    .attr("stroke", COLORS.live)
    .attr("stroke-width", 2.5)
    .attr("opacity", seriesOpacity("live"))
    .attr("d", lineLive);

  // —— Points ——
  const pointsLive = g
    .selectAll(".trend-point--live")
    .data(series.filter((d) => d.mean_live_coral != null))
    .join("circle")
    .attr("class", "trend-point trend-point--live")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.mean_live_coral))
    .attr("r", 3.5)
    .attr("fill", COLORS.live)
    .attr("opacity", seriesOpacity("live"));

  const pointsDead = g
    .selectAll(".trend-point--dead")
    .data(series.filter((d) => d.mean_dead_coral != null))
    .join("circle")
    .attr("class", "trend-point trend-point--dead")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.mean_dead_coral))
    .attr("r", 3.5)
    .attr("fill", COLORS.dead)
    .attr("opacity", seriesOpacity("dead"));

  // —— Hover layer ——
  const hoverG = g.append("g").attr("class", "trend-hover-layer");

  const guideLine = hoverG
    .append("line")
    .attr("class", "trend-guide-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .style("opacity", 0);

  const overlay = hoverG
    .append("rect")
    .attr("class", "trend-overlay")
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

      pointsLive
        .classed("trend-point--highlight", (d) => d.year === row.year)
        .attr("r", (d) => (d.year === row.year ? 6 : 3.5));

      pointsDead
        .classed("trend-point--highlight", (d) => d.year === row.year)
        .attr("r", (d) => (d.year === row.year ? 6 : 3.5));

      showTooltip(
        chart.tooltip,
        chart.container.node(),
        event,
        row,
        state
      );
    })
    .on("mouseleave", () => {
      guideLine.style("opacity", 0);
      pointsLive.classed("trend-point--highlight", false).attr("r", 3.5);
      pointsDead.classed("trend-point--highlight", false).attr("r", 3.5);
      hideTooltip(chart.tooltip);
    });

  // —— Legend ——
  const legend = svg
    .append("g")
    .attr("class", "trend-legend")
    .attr("transform", `translate(${width - MARGIN.right - 130}, 18)`);

  const legendItems = [
    { key: "live", label: "Live coral", color: COLORS.live },
    { key: "dead", label: "Dead coral", color: COLORS.dead },
  ];

  const legendRow = legend
    .selectAll(".trend-legend-item")
    .data(legendItems)
    .join("g")
    .attr("class", (d) =>
      [
        "trend-legend-item",
        chart.legendFocus && chart.legendFocus !== d.key
          ? "trend-legend-item--inactive"
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
    update(data, state);
  });
}
