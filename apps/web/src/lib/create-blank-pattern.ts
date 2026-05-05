import { buildLegend, type PatternCell, type PatternDocument, type PatternSettings } from "@perlerloom/core";

export function createBlankPattern(width: number, height: number, settings: PatternSettings): PatternDocument {
  const cells: PatternCell[] = Array.from({ length: width * height }, () => null);
  return {
    version: 1,
    width,
    height,
    paletteBrand: "mard",
    cells,
    settings: { ...settings },
    legend: buildLegend(cells)
  };
}
