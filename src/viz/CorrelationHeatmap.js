import * as d3 from "d3";

const MARGIN = { top: 56, right: 108, bottom: 110, left: 128 };
const CHART_HEIGHT = 460;

const COLOR_SCALE = d3
  .scaleLinear()
  .domain([-1, 0, 1])
  .range(["#2166ac", "#f7f7f7", "#b2182b"])
  .clamp(true);

const chart = {
  container: null,
  tooltip: null,
  explanationPanel: null,
  /** @type {{ row_var: string, col_var: string } | null} */
  selectedCell: null,
};

/** Unique axis variables sorted by order field. */
function orderedAxisVars(matrix, axis) {
  const isRow = axis === "row";
  const varKey = isRow ? "row_var" : "col_var";
  const labelKey = isRow ? "row_label" : "col_label";
  const orderKey = isRow ? "row_order" : "col_order";

  const byVar = d3.group(matrix, (d) => d[varKey]);
  const items = [];

  for (const [varName, rows] of byVar) {
    const sample = rows[0];
    items.push({
      var: varName,
      label: sample[labelKey],
      order: sample[orderKey] ?? 0,
    });
  }

  return d3.sort(items, (a, b) => a.order - b.order);
}

function cellKey(rowVar, colVar) {
  return `${rowVar}|${colVar}`;
}

function formatR(value) {
  return value == null ? "—" : d3.format(".2f")(value);
}

function labelFill(pearsonR) {
  return Math.abs(pearsonR ?? 0) > 0.45 ? "#ffffff" : "#1a2b3c";
}

/** Remove repeated causation caveat from interpretation copy. */
function cleanInterpretation(text) {
  return String(text ?? "")
    .replace(/Correlation indicates association, not causation\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function setInitialExplanation(panel) {
  if (!panel) return;
  panel.innerHTML =
    '<p class="heatmap-explanation-panel__placeholder">Click a cell in the heatmap to inspect the selected relationship.</p>';
}

function setSelectedExplanation(panel, cell) {
  if (!panel || !cell) return;

  const interpretation = cleanInterpretation(cell.interpretation);

  panel.innerHTML =
    `<h3 class="heatmap-explanation-title">${cell.row_label} × ${cell.col_label}</h3>` +
    `<p class="heatmap-explanation-stat"><strong>Pearson r:</strong> ${formatR(cell.pearson_r)}</p>` +
    `<p class="heatmap-explanation-stat"><strong>Spearman ρ:</strong> ${formatR(cell.spearman_r)}</p>` +
    `<p class="heatmap-explanation-stat"><strong>Complete cases:</strong> ${cell.n_complete ?? "—"}</p>` +
    `<p class="heatmap-explanation-text">${interpretation}</p>`;
}

function showTooltip(tooltip, containerNode, event, cell) {
  const [px, py] = d3.pointer(event, containerNode);
  const padding = 12;
  const offset = 14;
  const interpretation = cleanInterpretation(cell.interpretation);

  tooltip.style("opacity", 1).html(
    `<strong>${cell.row_label} × ${cell.col_label}</strong><br/>` +
      `Pearson r: ${formatR(cell.pearson_r)}<br/>` +
      `Spearman ρ: ${formatR(cell.spearman_r)}<br/>` +
      `Complete cases: ${cell.n_complete ?? "—"}` +
      (interpretation ? `<br/>${interpretation}` : "")
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

function drawColorLegend(svg, width, height) {
  const legendWidth = 14;
  const legendHeight = 120;
  const legendX = width - MARGIN.right + 24;
  const legendY = MARGIN.top + 20;

  const legend = svg
    .append("g")
    .attr("class", "heatmap-color-legend")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  const defs = svg.append("defs");
  const gradientId = "heatmap-pearson-gradient";

  const gradient = defs
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", COLOR_SCALE(-1));
  gradient.append("stop").attr("offset", "50%").attr("stop-color", COLOR_SCALE(0));
  gradient.append("stop").attr("offset", "100%").attr("stop-color", COLOR_SCALE(1));

  legend
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${gradientId})`)
    .attr("stroke", "#d4dde6");

  legend
    .append("text")
    .attr("class", "heatmap-color-legend-title")
    .attr("x", legendWidth + 6)
    .attr("y", 0)
    .text("Pearson r");

  const ticks = [
    { label: "+1", y: 0 },
    { label: "0", y: legendHeight / 2 },
    { label: "-1", y: legendHeight },
  ];

  legend
    .selectAll(".heatmap-color-legend-tick")
    .data(ticks)
    .join("text")
    .attr("class", "heatmap-color-legend-tick")
    .attr("x", legendWidth + 6)
    .attr("y", (d) => d.y + 4)
    .text((d) => d.label);
}

export function init(containerSelector, data, state, dispatch) {
  chart.container = d3.select(containerSelector);
  chart.container.selectAll("*").remove();
  chart.container.classed("chart-container--has-chart", true);
  chart.container.attr("aria-busy", "false");

  chart.tooltip = chart.container
    .append("div")
    .attr("class", "chart-tooltip heatmap-tooltip")
    .style("opacity", 0);

  chart.explanationPanel = document.getElementById("heatmap-explanation");
  setInitialExplanation(chart.explanationPanel);
}

export function update(data, state) {
  if (!chart.container) return;

  const matrix = data.correlationMatrix ?? [];
  chart.container.select("svg").remove();

  if (matrix.length === 0) {
    chart.container
      .append("p")
      .attr("class", "chart-empty-message chart-empty-message--dom")
      .text("Correlation matrix data is not available.");
    setInitialExplanation(chart.explanationPanel);
    return;
  }

  // Preserve selection if still valid after redraw
  const cellLookup = new Map(
    matrix.map((d) => [cellKey(d.row_var, d.col_var), d])
  );
  if (
    chart.selectedCell &&
    !cellLookup.has(cellKey(chart.selectedCell.row_var, chart.selectedCell.col_var))
  ) {
    chart.selectedCell = null;
    setInitialExplanation(chart.explanationPanel);
  } else if (chart.selectedCell) {
    const selected = cellLookup.get(
      cellKey(chart.selectedCell.row_var, chart.selectedCell.col_var)
    );
    if (selected) setSelectedExplanation(chart.explanationPanel, selected);
  }

  const rowAxis = orderedAxisVars(matrix, "row");
  const colAxis = orderedAxisVars(matrix, "col");
  const rowLabels = rowAxis.map((d) => d.label);
  const colLabels = colAxis.map((d) => d.label);

  const containerWidth = chart.container.node()?.clientWidth || 600;
  const width = Math.max(420, containerWidth);
  const height = CHART_HEIGHT;
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const svg = chart.container
    .append("svg")
    .attr("class", "heatmap-chart-svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr(
      "aria-label",
      "Heatmap of Pearson correlation coefficients among reef indicators"
    );

  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", MARGIN.left)
    .attr("y", 22)
    .text("Relationship overview of reef condition and disturbance indicators");

  svg
    .append("text")
    .attr("class", "chart-subtitle")
    .attr("x", MARGIN.left)
    .attr("y", 40)
    .text("Pearson correlation coefficients");

  const g = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const x = d3.scaleBand().domain(colLabels).range([0, innerWidth]).padding(0.06);
  const y = d3.scaleBand().domain(rowLabels).range([0, innerHeight]).padding(0.06);

  // —— Cells ——
  const cells = g
    .selectAll(".heatmap-cell")
    .data(matrix)
    .join("g")
    .attr("class", "heatmap-cell")
    .attr("transform", (d) => `translate(${x(d.col_label)},${y(d.row_label)})`)
    .style("cursor", "pointer");

  cells
    .append("rect")
    .attr("class", "heatmap-cell-rect")
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", (d) => COLOR_SCALE(d.pearson_r ?? 0))
    .attr("stroke", (d) =>
      chart.selectedCell &&
      d.row_var === chart.selectedCell.row_var &&
      d.col_var === chart.selectedCell.col_var
        ? "#1a2b3c"
        : "none"
    )
    .attr("stroke-width", (d) =>
      chart.selectedCell &&
      d.row_var === chart.selectedCell.row_var &&
      d.col_var === chart.selectedCell.col_var
        ? 2.5
        : 0
    );

  cells
    .append("text")
    .attr("class", "heatmap-cell-label")
    .attr("x", x.bandwidth() / 2)
    .attr("y", y.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", (d) => labelFill(d.pearson_r))
    .attr("pointer-events", "none")
    .text((d) => formatR(d.pearson_r));

  cells
    .on("mousemove", (event, d) => {
      showTooltip(chart.tooltip, chart.container.node(), event, d);
    })
    .on("mouseleave", () => {
      hideTooltip(chart.tooltip);
    })
    .on("click", (_, d) => {
      const isSame =
        chart.selectedCell &&
        chart.selectedCell.row_var === d.row_var &&
        chart.selectedCell.col_var === d.col_var;

      chart.selectedCell = isSame
        ? null
        : { row_var: d.row_var, col_var: d.col_var };

      if (chart.selectedCell) {
        setSelectedExplanation(chart.explanationPanel, d);
      } else {
        setInitialExplanation(chart.explanationPanel);
      }

      g.selectAll(".heatmap-cell-rect")
        .attr("stroke", (cell) =>
          chart.selectedCell &&
          cell.row_var === chart.selectedCell.row_var &&
          cell.col_var === chart.selectedCell.col_var
            ? "#1a2b3c"
            : "none"
        )
        .attr("stroke-width", (cell) =>
          chart.selectedCell &&
          cell.row_var === chart.selectedCell.row_var &&
          cell.col_var === chart.selectedCell.col_var
            ? 2.5
            : 0
        );
    });

  // —— Axes ——
  g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("class", "heatmap-axis-label")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.15em");

  g.append("g")
    .attr("class", "axis axis--y")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("class", "heatmap-axis-label");

  drawColorLegend(svg, width, height);
}
