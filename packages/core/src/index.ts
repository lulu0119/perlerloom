import {
  rgbToHex as paletteRgbToHex,
  rgbToHsl,
  rgbToLab,
  type BeadColor,
  type RgbColor
} from "@perlerloom/palettes";

export type MatchingSpace = "rgb" | "lab" | "hsl";
export type ClusteringSpace = "rgb" | "lab";
export type DownsamplingMode = "nearest" | "gridMode";

export type PatternCell = string | null;

export type PatternSettings = {
  targetColorCount: number;
  matchingSpace: MatchingSpace;
  clusteringSpace: ClusteringSpace;
  downsamplingMode: DownsamplingMode;
  ditheringEnabled: boolean;
};

export type PatternLegendItem = {
  code: string;
  count: number;
};

export type PatternDocument = {
  version: 1;
  width: number;
  height: number;
  paletteBrand: "mard";
  cells: PatternCell[];
  settings: PatternSettings;
  legend?: PatternLegendItem[];
  history?: PatternHistory;
};

export type PatternPoint = {
  column: number;
  row: number;
};

export type PatternSnapshot = Omit<PatternDocument, "history">;

export type PatternHistory = {
  past: PatternSnapshot[];
  present: PatternSnapshot;
  future: PatternSnapshot[];
};

export type ConvertImageInput = {
  pixels: RgbColor[];
  width: number;
  height: number;
  targetWidth?: number;
  targetHeight?: number;
  palette: BeadColor[];
  settings: PatternSettings;
};

const MAX_PATTERN_SIZE = 256;

type PaletteVector = {
  code: string;
  rgb: RgbColor;
  vec: readonly [number, number, number];
};

function buildPaletteVectors(palette: BeadColor[], matchingSpace: MatchingSpace): PaletteVector[] {
  return palette.map((color) => {
    if (matchingSpace === "lab") {
      return { code: color.code, rgb: color.rgb, vec: [color.lab.lightness, color.lab.greenRed, color.lab.blueYellow] as const };
    }
    if (matchingSpace === "hsl") {
      return { code: color.code, rgb: color.rgb, vec: [color.hsl.hue, color.hsl.saturation, color.hsl.lightness] as const };
    }
    return { code: color.code, rgb: color.rgb, vec: [color.rgb.red, color.rgb.green, color.rgb.blue] as const };
  });
}

function nearestPaletteCodeFromVectors(sourceRgb: RgbColor, paletteVectors: PaletteVector[], matchingSpace: MatchingSpace): string {
  let bestCode = paletteVectors[0].code;
  let bestDistance = Number.POSITIVE_INFINITY;

  if (matchingSpace === "lab") {
    const sourceLab = rgbToLab(sourceRgb);
    const sourceVec: readonly [number, number, number] = [sourceLab.lightness, sourceLab.greenRed, sourceLab.blueYellow];
    for (const entry of paletteVectors) {
      const distance = squaredDistanceVec3(sourceVec, entry.vec);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCode = entry.code;
      }
    }
    return bestCode;
  }

  if (matchingSpace === "hsl") {
    const sourceHsl = rgbToHsl(sourceRgb);
    const sourceVec: readonly [number, number, number] = [sourceHsl.hue, sourceHsl.saturation, sourceHsl.lightness];
    for (const entry of paletteVectors) {
      const distance = squaredDistanceVec3(sourceVec, entry.vec);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCode = entry.code;
      }
    }
    return bestCode;
  }

  const sourceVec: readonly [number, number, number] = [sourceRgb.red, sourceRgb.green, sourceRgb.blue];
  for (const entry of paletteVectors) {
    const distance = squaredDistanceVec3(sourceVec, entry.vec);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCode = entry.code;
    }
  }
  return bestCode;
}

function squaredDistanceVec3(left: readonly [number, number, number], right: readonly [number, number, number]): number {
  const delta0 = left[0] - right[0];
  const delta1 = left[1] - right[1];
  const delta2 = left[2] - right[2];
  return delta0 * delta0 + delta1 * delta1 + delta2 * delta2;
}

export function hexToRgb(hex: string): RgbColor {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`Invalid HEX color ${hex}.`);
  }

  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16)
  };
}

export function rgbToHex(rgb: RgbColor): string {
  return paletteRgbToHex(rgb);
}

export function findNearestPaletteColor(source: RgbColor, palette: BeadColor[], matchingSpace: MatchingSpace): BeadColor {
  if (palette.length === 0) {
    throw new Error("Palette must contain at least one color.");
  }

  let nearestColor = palette[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const color of palette) {
    const distance = colorDistance(source, color, matchingSpace);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestColor = color;
    }
  }

  return nearestColor;
}

export function convertImageToPattern(input: ConvertImageInput): PatternDocument {
  validateConversionInput(input);

  const targetWidth = input.targetWidth ?? input.width;
  const targetHeight = input.targetHeight ?? input.height;
  const sampledPixels = downsamplePixels(input.pixels, input.width, input.height, targetWidth, targetHeight, input.settings.downsamplingMode);
  const processedPixels = input.settings.ditheringEnabled ? ditherPixels(sampledPixels, targetWidth, targetHeight) : sampledPixels;
  const clusters = kMeansCluster(processedPixels, input.settings.targetColorCount, input.settings.clusteringSpace);
  const paletteVectors = buildPaletteVectors(input.palette, input.settings.matchingSpace);
  const cells = processedPixels.map((pixel) => {
    const cluster = findNearestRgb(pixel, clusters, input.settings.clusteringSpace);
    return nearestPaletteCodeFromVectors(cluster, paletteVectors, input.settings.matchingSpace);
  });

  return withLegend({
    version: 1,
    width: targetWidth,
    height: targetHeight,
    paletteBrand: "mard",
    cells,
    settings: input.settings
  });
}

export function kMeansCluster(pixels: RgbColor[], targetColorCount: number, clusteringSpace: ClusteringSpace): RgbColor[] {
  if (targetColorCount < 1) {
    throw new Error("Target color count must be at least 1.");
  }

  const uniquePixels = uniqueRgbPixels(pixels);
  if (uniquePixels.length <= targetColorCount) {
    return uniquePixels;
  }

  const samplePixels = samplePixelsForClustering(pixels, 8000);
  let centers = uniquePixels.slice(0, targetColorCount);

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const groups = centers.map((): RgbColor[] => []);

    for (const pixel of samplePixels) {
      const centerIndex = nearestRgbIndex(pixel, centers, clusteringSpace);
      groups[centerIndex].push(pixel);
    }

    centers = groups.map((group, index) => (group.length === 0 ? centers[index] : averageRgb(group)));
  }

  return centers;
}

function samplePixelsForClustering(pixels: RgbColor[], maxSamples: number): RgbColor[] {
  if (pixels.length <= maxSamples) {
    return pixels;
  }

  const step = Math.max(1, Math.floor(pixels.length / maxSamples));
  const sampled: RgbColor[] = [];
  for (let index = 0; index < pixels.length; index += step) {
    sampled.push(pixels[index]);
    if (sampled.length >= maxSamples) {
      break;
    }
  }
  return sampled;
}

export function replacePatternColor(
  pattern: PatternDocument,
  sourceCode: string,
  targetCode: string,
  existingHistory?: PatternHistory
): PatternDocument {
  const nextPattern = withLegend({
    ...snapshotOf(pattern),
    cells: pattern.cells.map((cell) => (cell === sourceCode ? targetCode : cell))
  });

  return withHistory(pattern, nextPattern, existingHistory);
}

export function deletePatternColor(pattern: PatternDocument, sourceCode: string, existingHistory?: PatternHistory): PatternDocument {
  const nextPattern = withLegend({
    ...snapshotOf(pattern),
    cells: pattern.cells.map((cell) => (cell === sourceCode ? null : cell))
  });

  return withHistory(pattern, nextPattern, existingHistory);
}

export function bucketFillPattern(
  pattern: PatternDocument,
  startPoint: PatternPoint,
  targetCode: string,
  existingHistory?: PatternHistory
): PatternDocument {
  const startIndex = pointToIndex(pattern, startPoint);
  const sourceCode = pattern.cells[startIndex];
  if (sourceCode === targetCode) {
    return pattern;
  }

  const cells = [...pattern.cells];
  const queue: PatternPoint[] = [startPoint];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const point = queue.shift();
    if (point === undefined || !isPointInside(pattern, point)) {
      continue;
    }

    const index = pointToIndex(pattern, point);
    if (visited.has(index) || cells[index] !== sourceCode) {
      continue;
    }

    visited.add(index);
    cells[index] = targetCode;
    queue.push(
      { column: point.column + 1, row: point.row },
      { column: point.column - 1, row: point.row },
      { column: point.column, row: point.row + 1 },
      { column: point.column, row: point.row - 1 }
    );
  }

  return withHistory(pattern, withLegend({ ...snapshotOf(pattern), cells }), existingHistory);
}

export function drawPatternLine(
  pattern: PatternDocument,
  startPoint: PatternPoint,
  endPoint: PatternPoint,
  targetCode: string,
  existingHistory?: PatternHistory
): PatternDocument {
  const cells = [...pattern.cells];
  const columnDelta = Math.abs(endPoint.column - startPoint.column);
  const rowDelta = Math.abs(endPoint.row - startPoint.row);
  const columnStep = startPoint.column < endPoint.column ? 1 : -1;
  const rowStep = startPoint.row < endPoint.row ? 1 : -1;
  let error = columnDelta - rowDelta;
  let column = startPoint.column;
  let row = startPoint.row;

  while (true) {
    const point = { column, row };
    if (isPointInside(pattern, point)) {
      cells[pointToIndex(pattern, point)] = targetCode;
    }
    if (column === endPoint.column && row === endPoint.row) {
      break;
    }
    const doubledError = error * 2;
    if (doubledError > -rowDelta) {
      error -= rowDelta;
      column += columnStep;
    }
    if (doubledError < columnDelta) {
      error += columnDelta;
      row += rowStep;
    }
  }

  return withHistory(pattern, withLegend({ ...snapshotOf(pattern), cells }), existingHistory);
}

export function selectPatternRectangle(pattern: PatternDocument, startPoint: PatternPoint, endPoint: PatternPoint): number[] {
  const left = Math.min(startPoint.column, endPoint.column);
  const right = Math.max(startPoint.column, endPoint.column);
  const top = Math.min(startPoint.row, endPoint.row);
  const bottom = Math.max(startPoint.row, endPoint.row);
  const indexes: number[] = [];

  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      const point = { column, row };
      if (isPointInside(pattern, point)) {
        indexes.push(pointToIndex(pattern, point));
      }
    }
  }

  return indexes;
}

export function undoPatternHistory(history: PatternHistory): { pattern: PatternDocument; history: PatternHistory } {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return { pattern: { ...history.present, history }, history };
  }

  const nextHistory = {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future]
  };

  return { pattern: { ...previous, history: nextHistory }, history: nextHistory };
}

export function redoPatternHistory(history: PatternHistory): { pattern: PatternDocument; history: PatternHistory } {
  const next = history.future[0];
  if (next === undefined) {
    return { pattern: { ...history.present, history }, history };
  }

  const nextHistory = {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1)
  };

  return { pattern: { ...next, history: nextHistory }, history: nextHistory };
}

export function buildLegend(cells: PatternCell[]): PatternLegendItem[] {
  const counts = new Map<string, number>();
  for (const cell of cells) {
    if (cell !== null) {
      counts.set(cell, (counts.get(cell) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => left.code.localeCompare(right.code, "en", { numeric: true }));
}

function validateConversionInput(input: ConvertImageInput): void {
  if (input.width < 1 || input.height < 1 || input.pixels.length !== input.width * input.height) {
    throw new Error("Image dimensions do not match pixel data.");
  }
  if (input.settings.targetColorCount < 1 || input.settings.targetColorCount > input.palette.length) {
    throw new Error("Target color count must be between 1 and the selected palette size.");
  }

  const targetWidth = input.targetWidth ?? input.width;
  const targetHeight = input.targetHeight ?? input.height;
  const sourceExceedsLimit = input.width > MAX_PATTERN_SIZE || input.height > MAX_PATTERN_SIZE;
  if (sourceExceedsLimit && (input.targetWidth === undefined || input.targetHeight === undefined)) {
    throw new Error("Images above 256 cells require explicit target dimensions.");
  }
  if (targetWidth > MAX_PATTERN_SIZE || targetHeight > MAX_PATTERN_SIZE) {
    throw new Error("Target dimensions must not exceed 256 by 256.");
  }
}

function downsamplePixels(
  pixels: RgbColor[],
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
  mode: DownsamplingMode
): RgbColor[] {
  if (width === targetWidth && height === targetHeight) {
    return pixels;
  }

  const output: RgbColor[] = [];
  for (let row = 0; row < targetHeight; row += 1) {
    for (let column = 0; column < targetWidth; column += 1) {
      output.push(mode === "nearest" ? nearestPixel(pixels, width, height, column, row, targetWidth, targetHeight) : gridModePixel(pixels, width, height, column, row, targetWidth, targetHeight));
    }
  }

  return output;
}

function nearestPixel(
  pixels: RgbColor[],
  width: number,
  height: number,
  column: number,
  row: number,
  targetWidth: number,
  targetHeight: number
): RgbColor {
  const sourceColumn = Math.min(width - 1, Math.floor((column + 0.5) * (width / targetWidth)));
  const sourceRow = Math.min(height - 1, Math.floor((row + 0.5) * (height / targetHeight)));
  return pixels[sourceRow * width + sourceColumn];
}

function gridModePixel(
  pixels: RgbColor[],
  width: number,
  height: number,
  column: number,
  row: number,
  targetWidth: number,
  targetHeight: number
): RgbColor {
  const left = Math.floor((column * width) / targetWidth);
  const right = Math.max(left + 1, Math.ceil(((column + 1) * width) / targetWidth));
  const top = Math.floor((row * height) / targetHeight);
  const bottom = Math.max(top + 1, Math.ceil(((row + 1) * height) / targetHeight));
  const counts = new Map<string, { color: RgbColor; count: number }>();

  for (let sourceRow = top; sourceRow < Math.min(bottom, height); sourceRow += 1) {
    for (let sourceColumn = left; sourceColumn < Math.min(right, width); sourceColumn += 1) {
      const color = pixels[sourceRow * width + sourceColumn];
      const key = rgbToHex(color);
      const current = counts.get(key);
      counts.set(key, { color, count: (current?.count ?? 0) + 1 });
    }
  }

  return [...counts.values()].sort((leftCount, rightCount) => rightCount.count - leftCount.count)[0].color;
}

function ditherPixels(pixels: RgbColor[], width: number, height: number): RgbColor[] {
  const output = pixels.map((pixel) => ({ ...pixel }));

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      const oldPixel = output[index];
      const newPixel = {
        red: oldPixel.red < 128 ? 0 : 255,
        green: oldPixel.green < 128 ? 0 : 255,
        blue: oldPixel.blue < 128 ? 0 : 255
      };
      const error = {
        red: oldPixel.red - newPixel.red,
        green: oldPixel.green - newPixel.green,
        blue: oldPixel.blue - newPixel.blue
      };
      output[index] = newPixel;
      distributeError(output, width, height, column + 1, row, error, 7 / 16);
      distributeError(output, width, height, column - 1, row + 1, error, 3 / 16);
      distributeError(output, width, height, column, row + 1, error, 5 / 16);
      distributeError(output, width, height, column + 1, row + 1, error, 1 / 16);
    }
  }

  return output;
}

function distributeError(
  pixels: RgbColor[],
  width: number,
  height: number,
  column: number,
  row: number,
  error: RgbColor,
  factor: number
): void {
  if (column < 0 || column >= width || row < 0 || row >= height) {
    return;
  }

  const index = row * width + column;
  pixels[index] = {
    red: clampRgb(pixels[index].red + error.red * factor),
    green: clampRgb(pixels[index].green + error.green * factor),
    blue: clampRgb(pixels[index].blue + error.blue * factor)
  };
}

function clampRgb(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function colorDistance(source: RgbColor, color: BeadColor, matchingSpace: MatchingSpace): number {
  if (matchingSpace === "lab") {
    const sourceLab = rgbToLab(source);
    return squaredDistance(
      [sourceLab.lightness, sourceLab.greenRed, sourceLab.blueYellow],
      [color.lab.lightness, color.lab.greenRed, color.lab.blueYellow]
    );
  }
  if (matchingSpace === "hsl") {
    const sourceHsl = rgbToHsl(source);
    return squaredDistance(
      [sourceHsl.hue, sourceHsl.saturation, sourceHsl.lightness],
      [color.hsl.hue, color.hsl.saturation, color.hsl.lightness]
    );
  }
  return squaredDistance([source.red, source.green, source.blue], [color.rgb.red, color.rgb.green, color.rgb.blue]);
}

function findNearestRgb(source: RgbColor, candidates: RgbColor[], clusteringSpace: ClusteringSpace): RgbColor {
  return candidates[nearestRgbIndex(source, candidates, clusteringSpace)];
}

function nearestRgbIndex(source: RgbColor, candidates: RgbColor[], clusteringSpace: ClusteringSpace): number {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const distance =
      clusteringSpace === "lab"
        ? squaredLabDistance(source, candidate)
        : squaredDistance([source.red, source.green, source.blue], [candidate.red, candidate.green, candidate.blue]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

function squaredLabDistance(left: RgbColor, right: RgbColor): number {
  const leftLab = rgbToLab(left);
  const rightLab = rgbToLab(right);
  return squaredDistance(
    [leftLab.lightness, leftLab.greenRed, leftLab.blueYellow],
    [rightLab.lightness, rightLab.greenRed, rightLab.blueYellow]
  );
}

function squaredDistance(left: number[], right: number[]): number {
  return left.reduce((total, value, index) => total + (value - right[index]) ** 2, 0);
}

function uniqueRgbPixels(pixels: RgbColor[]): RgbColor[] {
  const seen = new Set<string>();
  const uniquePixels: RgbColor[] = [];

  for (const pixel of pixels) {
    const key = rgbToHex(pixel);
    if (!seen.has(key)) {
      seen.add(key);
      uniquePixels.push(pixel);
    }
  }

  return uniquePixels;
}

function averageRgb(pixels: RgbColor[]): RgbColor {
  const total = pixels.reduce(
    (sum, pixel) => ({
      red: sum.red + pixel.red,
      green: sum.green + pixel.green,
      blue: sum.blue + pixel.blue
    }),
    { red: 0, green: 0, blue: 0 }
  );

  return {
    red: Math.round(total.red / pixels.length),
    green: Math.round(total.green / pixels.length),
    blue: Math.round(total.blue / pixels.length)
  };
}

function withLegend(pattern: PatternSnapshot): PatternSnapshot {
  return {
    ...pattern,
    legend: buildLegend(pattern.cells)
  };
}

function withHistory(pattern: PatternDocument, nextPattern: PatternSnapshot, existingHistory?: PatternHistory): PatternDocument {
  const currentHistory = existingHistory ?? pattern.history;
  const previousSnapshot = snapshotOf(pattern);
  const past = currentHistory ? [...currentHistory.past, currentHistory.present] : [previousSnapshot];
  const nextHistory = {
    past,
    present: nextPattern,
    future: []
  };

  return {
    ...nextPattern,
    history: nextHistory
  };
}

function snapshotOf(pattern: PatternDocument): PatternSnapshot {
  return {
    version: pattern.version,
    width: pattern.width,
    height: pattern.height,
    paletteBrand: pattern.paletteBrand,
    cells: [...pattern.cells],
    settings: pattern.settings,
    legend: buildLegend(pattern.cells)
  };
}

function pointToIndex(pattern: Pick<PatternDocument, "width">, point: PatternPoint): number {
  return point.row * pattern.width + point.column;
}

function isPointInside(pattern: Pick<PatternDocument, "width" | "height">, point: PatternPoint): boolean {
  return point.column >= 0 && point.column < pattern.width && point.row >= 0 && point.row < pattern.height;
}
