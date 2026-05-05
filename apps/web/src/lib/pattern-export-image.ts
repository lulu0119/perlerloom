import { buildLegend, type PatternDocument } from "@perlerloom/core";
import type { BeadColor } from "@perlerloom/palettes";
import { createCanvasLayout, drawPatternCanvas } from "@/features/pattern-editor/pattern-editor-utils";

const exportMarginPx = 16;
const legendPaddingPx = 12;
const legendRowHeightPx = 28;
const legendMinInnerWidthPx = 260;
const maxSideBySideTotalWidthPx = 1280;

function paletteMapForDrawing(paletteByCode: Map<string, BeadColor>): Map<string, { hex: string }> {
  return new Map([...paletteByCode.entries()].map(([code, color]) => [code, { hex: color.hex }]));
}

/** Prefer sharp chart; scale down only when the canvas would exceed a comfortable width. */
export function computeExportChartZoom(pattern: PatternDocument): number {
  const candidates: number[] = [1, 0.85, 0.75, 0.65, 0.55, 0.5];
  const maxChartWidthPx = 980;
  for (const zoom of candidates) {
    const layout = createCanvasLayout(pattern, zoom);
    if (layout.width <= maxChartWidthPx) {
      return zoom;
    }
  }
  return 0.5;
}

/**
 * Renders the bead chart plus a bead-count legend into a PNG blob (browser-only).
 */
export async function renderPatternExportToPngBlob(
  pattern: PatternDocument,
  paletteByCode: Map<string, BeadColor>
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("PNG export requires a browser environment.");
  }

  const zoom = computeExportChartZoom(pattern);
  const layout = createCanvasLayout(pattern, zoom);
  const drawingPalette = paletteMapForDrawing(paletteByCode);

  const chartCanvas = document.createElement("canvas");
  chartCanvas.width = layout.width;
  chartCanvas.height = layout.height;
  drawPatternCanvas(chartCanvas, pattern, drawingPalette, layout, null, null);

  const legendItems = pattern.legend ?? buildLegend(pattern.cells);
  const legendInnerWidthPx = legendMinInnerWidthPx;
  const legendWidthPx = legendInnerWidthPx + legendPaddingPx * 2;
  const legendHeightPx = legendItems.length * legendRowHeightPx + legendPaddingPx * 2;

  const sideBySideWidthPx = layout.width + exportMarginPx + legendWidthPx;
  const sideBySideHeightPx = Math.max(layout.height, legendHeightPx);

  const outputCanvas = document.createElement("canvas");
  const context = outputCanvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas is not available for export.");
  }

  let chartOriginX = 0;
  let chartOriginY = 0;
  let legendOriginX = layout.width + exportMarginPx;
  let legendOriginY = (sideBySideHeightPx - legendHeightPx) / 2;

  if (sideBySideWidthPx > maxSideBySideTotalWidthPx) {
    outputCanvas.width = Math.max(layout.width, legendWidthPx + exportMarginPx * 2);
    outputCanvas.height = layout.height + exportMarginPx + legendHeightPx;
    chartOriginX = (outputCanvas.width - layout.width) / 2;
    chartOriginY = 0;
    legendOriginX = (outputCanvas.width - legendWidthPx) / 2;
    legendOriginY = layout.height + exportMarginPx;
  } else {
    outputCanvas.width = sideBySideWidthPx;
    outputCanvas.height = sideBySideHeightPx;
    chartOriginY = (sideBySideHeightPx - layout.height) / 2;
    legendOriginY = (sideBySideHeightPx - legendHeightPx) / 2;
  }

  context.fillStyle = "#fffaf2";
  context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  context.drawImage(chartCanvas, chartOriginX, chartOriginY);

  context.fillStyle = "#ffffff";
  context.strokeStyle = "#d9d0c5";
  context.lineWidth = 1;
  context.fillRect(legendOriginX, legendOriginY, legendWidthPx, legendHeightPx);
  context.strokeRect(legendOriginX, legendOriginY, legendWidthPx, legendHeightPx);

  context.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textBaseline = "middle";

  legendItems.forEach((item, index) => {
    const centerY = legendOriginY + legendPaddingPx + index * legendRowHeightPx + legendRowHeightPx / 2;
    const beadColor = paletteByCode.get(item.code);
    const swatchHex = beadColor?.hex ?? "#ffffff";
    const swatchX = legendOriginX + legendPaddingPx;
    const swatchY = centerY - 10;
    context.fillStyle = swatchHex;
    context.fillRect(swatchX, swatchY, 22, 20);
    context.strokeStyle = "#b89f88";
    context.strokeRect(swatchX, swatchY, 22, 20);

    const labelName = beadColor?.name ?? item.code;
    context.fillStyle = "#2a241d";
    context.textAlign = "left";
    context.fillText(`${item.code}  ${labelName}  ×${String(item.count)}`, swatchX + 28, centerY);
  });

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("PNG export failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
