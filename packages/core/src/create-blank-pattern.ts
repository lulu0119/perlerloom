import { buildLegend } from "./build-legend";
import type { PatternCell, PatternDocument, PatternSettings } from "./index";

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
