import { describe, expect, it } from "vitest";
import { mardPalette } from "@perlerloom/palettes";
import {
  bucketFillPattern,
  convertImageToPattern,
  deletePatternColor,
  drawPatternLine,
  findNearestPaletteColor,
  hexToRgb,
  kMeansCluster,
  readableTextHexOnBackgroundHex,
  redoPatternHistory,
  replacePatternColor,
  rgbToHex,
  selectPatternRectangle,
  undoPatternHistory,
  type PatternDocument,
  type PatternHistory
} from "./index";

describe("color helpers", () => {
  it("round-trips RGB and HEX values", () => {
    expect(hexToRgb("#FAF4C8")).toEqual({ red: 250, green: 244, blue: 200 });
    expect(rgbToHex({ red: 250, green: 244, blue: 200 })).toBe("#FAF4C8");
  });

  it("matches exact Mard colors by RGB and Lab", () => {
    const source = { red: 250, green: 244, blue: 200 };

    expect(findNearestPaletteColor(source, mardPalette, "rgb").code).toBe("A1");
    expect(findNearestPaletteColor(source, mardPalette, "lab").code).toBe("A1");
  });

  it("picks dark text on light backgrounds and light text on dark backgrounds", () => {
    expect(readableTextHexOnBackgroundHex("#ffffff")).toBe("#171717");
    expect(readableTextHexOnBackgroundHex("#000000")).toBe("#f4f4f5");
  });
});

describe("image conversion", () => {
  const hardEdgePixels = [
    { red: 0, green: 0, blue: 0 },
    { red: 255, green: 255, blue: 255 },
    { red: 0, green: 0, blue: 0 },
    { red: 255, green: 255, blue: 255 }
  ];

  it("keeps images within the limit at source dimensions", () => {
    const pattern = convertImageToPattern({
      pixels: hardEdgePixels,
      width: 2,
      height: 2,
      palette: mardPalette,
      settings: {
        targetColorCount: 2,
        matchingSpace: "rgb",
        clusteringSpace: "rgb",
        downsamplingMode: "nearest"
      }
    });

    expect(pattern.width).toBe(2);
    expect(pattern.height).toBe(2);
    expect(pattern.cells).toEqual(["H7", "T1", "H7", "T1"]);
  });

  it("requires explicit target dimensions above the 256 pattern cap", () => {
    expect(() =>
      convertImageToPattern({
        pixels: Array.from({ length: 257 }, () => ({ red: 0, green: 0, blue: 0 })),
        width: 257,
        height: 1,
        palette: mardPalette,
        settings: {
          targetColorCount: 1,
          matchingSpace: "rgb",
          clusteringSpace: "rgb",
          downsamplingMode: "nearest"
        }
      })
    ).toThrow(/target dimensions/i);
  });

  it("uses grid mode to choose representative cell colors", () => {
    const pattern = convertImageToPattern({
      pixels: [
        { red: 0, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 0 },
        { red: 255, green: 255, blue: 255 },
        { red: 0, green: 0, blue: 0 }
      ],
      width: 2,
      height: 2,
      targetWidth: 1,
      targetHeight: 1,
      palette: mardPalette,
      settings: {
        targetColorCount: 1,
        matchingSpace: "rgb",
        clusteringSpace: "rgb",
        downsamplingMode: "gridMode"
      }
    });

    expect(pattern.cells).toEqual(["H7"]);
  });

  it("limits K-Means output to the requested color count", () => {
    const clusters = kMeansCluster(
      [
        { red: 0, green: 0, blue: 0 },
        { red: 4, green: 4, blue: 4 },
        { red: 255, green: 255, blue: 255 },
        { red: 250, green: 250, blue: 250 }
      ],
      2,
      "rgb"
    );

    expect(clusters).toHaveLength(2);
  });

  it("keeps K-Means clustering tractable on large inputs by subsampling", () => {
    const pixels = Array.from({ length: 200_000 }, (_, index) => ({
      red: index % 255,
      green: (index * 7) % 255,
      blue: (index * 13) % 255
    }));
    const startedAt = performance.now();
    const clusters = kMeansCluster(pixels, 24, "rgb");
    const elapsedMs = performance.now() - startedAt;

    expect(clusters).toHaveLength(24);
    expect(elapsedMs).toBeLessThan(5000);
  });
});

describe("pattern editing and history", () => {
  const pattern: PatternDocument = {
    version: 1,
    width: 3,
    height: 3,
    paletteBrand: "mard" as const,
    cells: ["H7", "H7", "T1", "H7", "T1", "T1", "H7", "H7", "T1"],
    settings: {
      targetColorCount: 2,
      matchingSpace: "rgb" as const,
      clusteringSpace: "rgb" as const,
      downsamplingMode: "nearest" as const
    }
  };

  it("replaces and deletes colors while updating legend counts", () => {
    const replaced = replacePatternColor(pattern, "H7", "A1");
    expect(replaced.cells.filter((cell) => cell === "A1")).toHaveLength(5);
    expect(requireLegend(replaced).find((item) => item.code === "A1")?.count).toBe(5);

    const deleted = deletePatternColor(replaced, "A1");
    expect(deleted.cells.filter((cell) => cell === null)).toHaveLength(5);
  });

  it("fills only a contiguous bucket region", () => {
    const filled = bucketFillPattern(pattern, { column: 0, row: 0 }, "A1");

    expect(filled.cells).toEqual(["A1", "A1", "T1", "A1", "T1", "T1", "A1", "A1", "T1"]);
  });

  it("draws horizontal, vertical, and diagonal lines", () => {
    expect(drawPatternLine(pattern, { column: 0, row: 0 }, { column: 2, row: 0 }, "A1").cells.slice(0, 3)).toEqual([
      "A1",
      "A1",
      "A1"
    ]);
    expect(drawPatternLine(pattern, { column: 0, row: 0 }, { column: 0, row: 2 }, "A1").cells[6]).toBe("A1");
    expect(drawPatternLine(pattern, { column: 0, row: 0 }, { column: 2, row: 2 }, "A1").cells[8]).toBe("A1");
  });

  it("clears cells along a line when target is null", () => {
    const erased = drawPatternLine(pattern, { column: 0, row: 0 }, { column: 2, row: 0 }, null);
    expect(erased.cells.slice(0, 3)).toEqual([null, null, null]);
    expect(requireLegend(erased).find((item) => item.code === "H7")?.count).toBe(3);
  });

  it("selects rectangular cells", () => {
    expect(selectPatternRectangle(pattern, { column: 1, row: 1 }, { column: 2, row: 2 })).toEqual([4, 5, 7, 8]);
  });

  it("undoes, redoes, and clears redo after a new edit", () => {
    const first = replacePatternColor(pattern, "H7", "A1");
    const undone = undoPatternHistory(requireHistory(first));
    const redone = redoPatternHistory(undone.history);
    const editedAfterUndo = replacePatternColor(undone.pattern, "T1", "A1", undone.history);

    expect(undone.pattern.cells).toEqual(pattern.cells);
    expect(redone.pattern.cells).toEqual(first.cells);
    expect(requireHistory(editedAfterUndo).future).toHaveLength(0);
    expect(JSON.stringify(editedAfterUndo.history)).not.toContain("data:image");
  });
});

function requireLegend(pattern: PatternDocument) {
  if (pattern.legend === undefined) {
    throw new Error("Expected pattern legend.");
  }
  return pattern.legend;
}

function requireHistory(pattern: PatternDocument): PatternHistory {
  if (pattern.history === undefined) {
    throw new Error("Expected pattern history.");
  }
  return pattern.history;
}
