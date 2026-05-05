import { describe, expect, it } from "vitest";
import { createExportMetadata } from "./pattern-export-metadata";
import { createSharePayload, validateSavedPatternPayload, type SavedPatternPayload } from "./pattern-storage";

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
    downsamplingMode: "nearest",
    ditheringEnabled: false
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
