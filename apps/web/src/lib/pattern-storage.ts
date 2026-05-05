import type { PatternCell, PatternSettings } from "@perlerloom/core";

export type SavedPatternPayload = {
  ownerId: string;
  version: 1;
  title: string;
  dimensions: {
    width: number;
    height: number;
  };
  paletteBrand: "mard";
  cells: PatternCell[];
  settings: PatternSettings;
  editorSettings: {
    textStyle: "blackWithWhiteOutline" | "whiteWithBlackOutline";
    smallGridColor: string;
    majorGridColor: string;
  };
  history: {
    past: unknown[];
    future: unknown[];
  };
};

export type SharePayload = {
  patternId: string;
  createdBy: string;
  access: "readOnly";
};

export function validateSavedPatternPayload(payload: SavedPatternPayload): SavedPatternPayload {
  if (payload.ownerId.length === 0) {
    throw new Error("Saved pattern payload requires an owner id.");
  }
  if (payload.version !== 1) {
    throw new Error("Saved pattern payload has an unsupported version.");
  }
  if (payload.dimensions.width < 1 || payload.dimensions.height < 1 || payload.dimensions.width > 256 || payload.dimensions.height > 256) {
    throw new Error("Saved pattern dimensions must be between 1 and 256.");
  }
  if (payload.cells.length !== payload.dimensions.width * payload.dimensions.height) {
    throw new Error("Saved pattern dimensions do not match cell data.");
  }
  if (payload.paletteBrand !== "mard") {
    throw new Error("Only Mard palette patterns are supported in the MVP.");
  }

  return payload;
}

export function createSharePayload(patternId: string, createdBy: string): SharePayload {
  if (patternId.length === 0 || createdBy.length === 0) {
    throw new Error("Share payload requires pattern and creator identifiers.");
  }

  return {
    patternId,
    createdBy,
    access: "readOnly"
  };
}
