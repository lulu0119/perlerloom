import type { LucideIcon } from "lucide-react";
import { Hand, Minus, PaintBucket, Pencil, Pipette } from "lucide-react";
import {
  readableTextHexOnBackgroundHex,
  type ClusteringSpace,
  type DownsamplingMode,
  type MatchingSpace,
  type PatternDocument,
  type PatternPoint
} from "@perlerloom/core";
import { majorGridLineCellIndices } from "@/lib/major-grid-line-indices";
import type { ResizeMode, SelectedSourceImage } from "./generate-import-dialog";

export type EditorTool = "pencil" | "eyedropper" | "paintBucket" | "hand" | "line";

export type ImportFormLayoutDefaults = {
  resizeMode: ResizeMode;
  targetWidth: string;
  targetHeight: string;
  scalePercent: string;
};

export type HistoryEntry = {
  id: string;
  label: string;
  pattern: PatternDocument;
};

export type CanvasLayout = {
  cellSize: number;
  headerSize: number;
  width: number;
  height: number;
};

export const maxPatternDimension = 256;
export const maxHistoryEntries = 24;
const baseCellSize = 28;
const baseHeaderSize = 32;

const PATTERN_CANVAS_MONO_FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, monospace";
const PATTERN_CANVAS_BEAD_CODE_FONT_CELL_FRACTION = 0.42;
const PATTERN_CANVAS_AXIS_LABEL_FONT_CELL_FRACTION = 0.32;
const PATTERN_CANVAS_HIDE_BEAD_CODES_WHEN_CELL_BELOW_PX = 10;
const PATTERN_CANVAS_MAJOR_GRID_STEP = 5;

export const CHART_ZOOM_STEPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function clonePattern(pattern: PatternDocument): PatternDocument {
  return {
    version: pattern.version,
    width: pattern.width,
    height: pattern.height,
    paletteBrand: pattern.paletteBrand,
    cells: [...pattern.cells],
    settings: { ...pattern.settings },
    legend: pattern.legend === undefined ? undefined : pattern.legend.map((item) => ({ ...item }))
  };
}

export function createHistoryId(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isMatchingSpace(value: string): value is MatchingSpace {
  return value === "rgb" || value === "lab" || value === "hsl";
}

export function isClusteringSpace(value: string): value is ClusteringSpace {
  return value === "rgb" || value === "lab";
}

export function isDownsamplingMode(value: string): value is DownsamplingMode {
  return value === "nearest" || value === "gridMode";
}

export function getToolIcon(tool: EditorTool): LucideIcon {
  if (tool === "paintBucket") {
    return PaintBucket;
  }
  if (tool === "eyedropper") {
    return Pipette;
  }
  if (tool === "hand") {
    return Hand;
  }
  if (tool === "line") {
    return Minus;
  }
  return Pencil;
}

export function getCanvasCursorClassName(activeTool: EditorTool): string {
  return activeTool === "hand" ? "cursor-grab" : "cursor-crosshair";
}

export function clampZoom(value: number): number {
  return Math.min(3, Math.max(0.5, Math.round(value * 10) / 10));
}

export function snapZoomToChartStep(value: number): number {
  const clamped = clampZoom(value);
  let closest = CHART_ZOOM_STEPS[0]!;
  let closestAbs = Math.abs(clamped - closest);
  for (const step of CHART_ZOOM_STEPS) {
    const abs = Math.abs(clamped - step);
    if (abs < closestAbs) {
      closestAbs = abs;
      closest = step;
    }
  }
  return closest;
}

export function stepChartZoom(current: number, direction: -1 | 1): number {
  const normalized = snapZoomToChartStep(current);
  const index = CHART_ZOOM_STEPS.indexOf(normalized);
  const safeIndex = index === -1 ? 0 : index;
  const nextIndex = safeIndex + direction;
  if (nextIndex < 0 || nextIndex >= CHART_ZOOM_STEPS.length) {
    return normalized;
  }
  return CHART_ZOOM_STEPS[nextIndex]!;
}

export function createCanvasLayout(pattern: PatternDocument, zoom: number): CanvasLayout {
  const cellSize = Math.max(12, Math.round(baseCellSize * zoom));
  const headerSize = Math.max(24, Math.round(baseHeaderSize * zoom));
  return {
    cellSize,
    headerSize,
    width: pattern.width * cellSize + headerSize * 2,
    height: pattern.height * cellSize + headerSize * 2
  };
}

export function suggestTargetSize(width: number, height: number): { width: number; height: number; scalePercent: number } {
  const scale = Math.min(1, maxPatternDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scalePercent: Math.max(1, Math.floor(scale * 100))
  };
}

export function buildImportFormLayoutDefaults(
  pattern: PatternDocument,
  image: Pick<SelectedSourceImage, "width" | "height"> | null
): ImportFormLayoutDefaults {
  if (image === null) {
    return {
      resizeMode: "original",
      targetWidth: String(pattern.width),
      targetHeight: String(pattern.height),
      scalePercent: "100"
    };
  }
  const suggested = suggestTargetSize(image.width, image.height);
  const large = image.width > maxPatternDimension || image.height > maxPatternDimension;
  return {
    resizeMode: large ? "dimensions" : "original",
    targetWidth: String(suggested.width),
    targetHeight: String(suggested.height),
    scalePercent: String(suggested.scalePercent)
  };
}

export function getTargetDimensions(
  selectedSourceImage: SelectedSourceImage,
  resizeMode: ResizeMode,
  targetWidthInput: string,
  targetHeightInput: string,
  scalePercentInput: string
): { width?: number; height?: number } | null {
  if (resizeMode === "original") {
    if (selectedSourceImage.width > maxPatternDimension || selectedSourceImage.height > maxPatternDimension) {
      return null;
    }
    return {};
  }

  if (resizeMode === "scale") {
    const scalePercent = Number(scalePercentInput);
    if (!Number.isFinite(scalePercent) || scalePercent <= 0 || scalePercent > 100) {
      return null;
    }
    const width = Math.max(1, Math.round((selectedSourceImage.width * scalePercent) / 100));
    const height = Math.max(1, Math.round((selectedSourceImage.height * scalePercent) / 100));
    if (width > maxPatternDimension || height > maxPatternDimension) {
      return null;
    }
    return { width, height };
  }

  const width = Number(targetWidthInput);
  const height = Number(targetHeightInput);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > maxPatternDimension || height > maxPatternDimension) {
    return null;
  }
  return { width, height };
}

export async function readImageFile(file: File): Promise<{ rgbBytes: ArrayBuffer; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas is not available for image conversion.");
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const rgba = imageData.data;
  const rgbByteLength = Math.floor(rgba.length / 4) * 3;
  const rgbBytes = new ArrayBuffer(rgbByteLength);
  const rgbView = new Uint8Array(rgbBytes);
  let writeIndex = 0;
  for (let index = 0; index < rgba.length; index += 4) {
    rgbView[writeIndex] = rgba[index];
    rgbView[writeIndex + 1] = rgba[index + 1];
    rgbView[writeIndex + 2] = rgba[index + 2];
    writeIndex += 3;
  }
  return { rgbBytes, width: canvas.width, height: canvas.height };
}

function pointCenter(point: PatternPoint, layout: CanvasLayout): { x: number; y: number } {
  return {
    x: layout.headerSize + point.column * layout.cellSize + layout.cellSize / 2,
    y: layout.headerSize + point.row * layout.cellSize + layout.cellSize / 2
  };
}

function drawOuterMajorLines(context: CanvasRenderingContext2D, pattern: PatternDocument, layout: CanvasLayout): void {
  context.strokeStyle = "#b85b52";
  context.lineWidth = 2;

  function strokeVerticalLine(atColumnIndex: number): void {
    const x = layout.headerSize + atColumnIndex * layout.cellSize;
    context.beginPath();
    context.moveTo(x, layout.headerSize);
    context.lineTo(x, layout.headerSize + pattern.height * layout.cellSize);
    context.stroke();
  }

  function strokeHorizontalLine(atRowIndex: number): void {
    const y = layout.headerSize + atRowIndex * layout.cellSize;
    context.beginPath();
    context.moveTo(layout.headerSize, y);
    context.lineTo(layout.headerSize + pattern.width * layout.cellSize, y);
    context.stroke();
  }

  for (const column of majorGridLineCellIndices(pattern.width, PATTERN_CANVAS_MAJOR_GRID_STEP)) {
    strokeVerticalLine(column);
  }

  for (const row of majorGridLineCellIndices(pattern.height, PATTERN_CANVAS_MAJOR_GRID_STEP)) {
    strokeHorizontalLine(row);
  }
}

export function canvasPointToPatternPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  pattern: PatternDocument,
  layout: CanvasLayout
): PatternPoint | null {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((clientX - rect.left - layout.headerSize) / layout.cellSize);
  const row = Math.floor((clientY - rect.top - layout.headerSize) / layout.cellSize);
  if (column < 0 || row < 0 || column >= pattern.width || row >= pattern.height) {
    return null;
  }
  return { column, row };
}

export function drawPatternCanvas(
  canvas: HTMLCanvasElement,
  pattern: PatternDocument,
  paletteByCode: Map<string, { hex: string }>,
  layout: CanvasLayout,
  lineStartPoint: PatternPoint | null,
  linePreviewPoint: PatternPoint | null
): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fffaf2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e7ded1";
  context.fillRect(0, 0, canvas.width, layout.headerSize);
  context.fillRect(0, canvas.height - layout.headerSize, canvas.width, layout.headerSize);
  context.fillRect(0, 0, layout.headerSize, canvas.height);
  context.fillRect(canvas.width - layout.headerSize, 0, layout.headerSize, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  const axisLabelFontPx = Math.round(layout.cellSize * PATTERN_CANVAS_AXIS_LABEL_FONT_CELL_FRACTION);
  context.font = `600 ${axisLabelFontPx}px ${PATTERN_CANVAS_MONO_FONT_FAMILY}`;

  for (let column = 0; column < pattern.width; column += 1) {
    const x = layout.headerSize + column * layout.cellSize + layout.cellSize / 2;
    context.fillStyle = "#6b5b4b";
    context.fillText(String(column + 1), x, layout.headerSize / 2);
    context.fillText(String(column + 1), x, canvas.height - layout.headerSize / 2);
  }

  for (let row = 0; row < pattern.height; row += 1) {
    const y = layout.headerSize + row * layout.cellSize + layout.cellSize / 2;
    context.fillStyle = "#6b5b4b";
    context.fillText(String(row + 1), layout.headerSize / 2, y);
    context.fillText(String(row + 1), canvas.width - layout.headerSize / 2, y);
  }

  for (let row = 0; row < pattern.height; row += 1) {
    for (let column = 0; column < pattern.width; column += 1) {
      const index = row * pattern.width + column;
      const code = pattern.cells[index];
      const x = layout.headerSize + column * layout.cellSize;
      const y = layout.headerSize + row * layout.cellSize;
      context.fillStyle = code === null ? "#ffffff" : paletteByCode.get(code)?.hex ?? "#ffffff";
      context.fillRect(x, y, layout.cellSize, layout.cellSize);
      context.strokeStyle = "#d9d0c5";
      context.lineWidth = 1;
      context.strokeRect(x, y, layout.cellSize, layout.cellSize);
    }
  }

  if (layout.cellSize >= PATTERN_CANVAS_HIDE_BEAD_CODES_WHEN_CELL_BELOW_PX) {
    const beadCodeFontPx = Math.round(layout.cellSize * PATTERN_CANVAS_BEAD_CODE_FONT_CELL_FRACTION);
    context.font = `700 ${beadCodeFontPx}px ${PATTERN_CANVAS_MONO_FONT_FAMILY}`;
    for (let row = 0; row < pattern.height; row += 1) {
      for (let column = 0; column < pattern.width; column += 1) {
        const index = row * pattern.width + column;
        const code = pattern.cells[index];
        if (code === null) {
          continue;
        }
        const x = layout.headerSize + column * layout.cellSize;
        const y = layout.headerSize + row * layout.cellSize;
        const backgroundHex = paletteByCode.get(code)?.hex ?? "#ffffff";
        const centerX = x + layout.cellSize / 2;
        const centerY = y + layout.cellSize / 2;
        context.fillStyle = readableTextHexOnBackgroundHex(backgroundHex);
        context.fillText(code, centerX, centerY);
      }
    }
  }

  drawOuterMajorLines(context, pattern, layout);

  if (lineStartPoint !== null && linePreviewPoint !== null) {
    context.strokeStyle = "#111827";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(pointCenter(lineStartPoint, layout).x, pointCenter(lineStartPoint, layout).y);
    context.lineTo(pointCenter(linePreviewPoint, layout).x, pointCenter(linePreviewPoint, layout).y);
    context.stroke();
  }
}
