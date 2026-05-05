import { createBlankPattern } from "@perlerloom/core";
import { describe, expect, it } from "vitest";
import { createExportMetadata } from "./pattern-export-metadata";
import {
  createSharePayload,
  importPatternRecordFromExportJson,
  parsePatternLibraryDocument,
  serializePatternLibraryDocument,
  validatePatternLibraryDocument,
  validateSavedPatternPayload,
  type PatternLibraryDocument,
  type PatternRecord,
  type SavedPatternPayload
} from "./pattern-storage";

const validPayload: SavedPatternPayload = {
  ownerId: "user-1",
  version: 1,
  title: "Demo pattern",
  dimensions: { width: 2, height: 1 },
  paletteBrand: "mard",
  cells: ["H7", "T1"],
  settings: {
    targetColorCount: 2,
    matchingSpace: "rgb",
    clusteringSpace: "rgb",
    downsamplingMode: "nearest"
  },
  editorSettings: {
    textStyle: "blackWithWhiteOutline",
    smallGridColor: "#D6C9B8",
    majorGridColor: "#6B5B4B"
  },
  history: {
    past: [],
    future: []
  }
};

describe("pattern storage contract", () => {
  it("accepts a complete saved pattern payload", () => {
    expect(validateSavedPatternPayload(validPayload)).toEqual(validPayload);
  });

  it("rejects payloads without an owner id", () => {
    expect(() => validateSavedPatternPayload({ ...validPayload, ownerId: "" })).toThrow(/owner/i);
  });

  it("rejects payloads whose dimensions do not match cells", () => {
    expect(() =>
      validateSavedPatternPayload({
        ...validPayload,
        dimensions: { width: 3, height: 1 }
      })
    ).toThrow(/dimensions/i);
  });

  it("creates read-only share records without owner edit access", () => {
    expect(createSharePayload("pattern-1", "user-1")).toEqual({
      patternId: "pattern-1",
      createdBy: "user-1",
      access: "readOnly"
    });
  });

  it("includes attribution and QR payload in export metadata", () => {
    expect(createExportMetadata("https://perlerloom.app/share/demo")).toEqual({
      attributionUrl: "https://perlerloom.app",
      qrPayload: "https://perlerloom.app/share/demo"
    });
  });
});

const sampleSettings = {
  targetColorCount: 24,
  matchingSpace: "lab" as const,
  clusteringSpace: "lab" as const,
  downsamplingMode: "nearest" as const
};

function minimalPattern(): ReturnType<typeof createBlankPattern> {
  return createBlankPattern(2, 2, sampleSettings);
}

describe("pattern library document", () => {
  const baseRecord: PatternRecord = {
    id: "pat-1",
    title: "Test",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    pattern: minimalPattern(),
    historyEntries: [
      {
        id: "h1",
        labelKey: "history.generatedPattern",
        pattern: minimalPattern()
      }
    ],
    activeHistoryIndex: 0,
    storage: { provider: "local" }
  };

  const validLibrary: PatternLibraryDocument = {
    version: 1,
    activePatternId: "pat-1",
    patterns: [baseRecord]
  };

  it("accepts a complete pattern library document", () => {
    expect(validatePatternLibraryDocument(validLibrary)).toEqual(validLibrary);
  });

  it("rejects unknown library version", () => {
    expect(() => validatePatternLibraryDocument({ ...validLibrary, version: 99 as unknown as 1 })).toThrow(/version/i);
  });

  it("rejects patterns whose cells do not match dimensions", () => {
    const badPattern = { ...minimalPattern(), cells: minimalPattern().cells.slice(0, 2) };
    expect(() =>
      validatePatternLibraryDocument({
        ...validLibrary,
        patterns: [{ ...baseRecord, pattern: badPattern }]
      })
    ).toThrow(/cells/i);
  });

  it("rejects active history index out of range", () => {
    expect(() =>
      validatePatternLibraryDocument({
        ...validLibrary,
        patterns: [{ ...baseRecord, activeHistoryIndex: 5 }]
      })
    ).toThrow(/history/i);
  });

  it("round-trips through JSON parse and serialize", () => {
    const json = serializePatternLibraryDocument(validLibrary);
    expect(parsePatternLibraryDocument(json)).toEqual(validLibrary);
  });

  it("import assigns a new id and preserves pattern data", () => {
    const exported = {
      format: "perlerloom.patternRecord" as const,
      version: 1 as const,
      exportedAt: "2025-03-01T12:00:00.000Z",
      record: baseRecord
    };
    const imported = importPatternRecordFromExportJson(JSON.stringify(exported), () => "new-local-id");
    expect(imported.id).toBe("new-local-id");
    expect(imported.pattern.width).toBe(2);
    expect(imported.pattern.height).toBe(2);
    expect(imported.historyEntries).toHaveLength(1);
    expect(imported.historyEntries[0]?.labelKey).toBe("history.generatedPattern");
    expect(imported.title).toBe("Test");
  });
});
