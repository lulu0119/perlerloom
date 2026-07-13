import type { PatternCell, PatternDocument, PatternSettings } from "@perlerloom/core";

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

/** Stored editor undo/redo entries (same shape as HistoryEntry in the UI layer). */
export const HISTORY_LABEL_KEYS = [
  "history.generatedPattern",
  "history.pencilStroke",
  "history.eraserStroke",
  "history.bucketFill",
  "history.line",
  "history.replace",
  "history.delete"
] as const;

export type SavedHistoryLabelKey = (typeof HISTORY_LABEL_KEYS)[number];

export type SavedHistoryEntry = {
  id: string;
  labelKey: SavedHistoryLabelKey;
  pattern: PatternDocument;
};

export type PatternRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pattern: PatternDocument;
  historyEntries: SavedHistoryEntry[];
  activeHistoryIndex: number;
  storage: { provider: "local"; cloudId?: string };
};

export type PatternLibraryDocument = {
  version: 1;
  activePatternId: string | null;
  patterns: PatternRecord[];
};

export type PatternRecordExportFile = {
  format: "douloom.patternRecord";
  version: 1;
  exportedAt: string;
  record: PatternRecord;
};

export const PATTERN_LIBRARY_STORAGE_KEY = "douloom.patternLibrary";

const MARD_PALETTE_MAX = 291;
const MAX_PATTERN_SIZE = 256;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMatchingSpace(value: string): value is PatternSettings["matchingSpace"] {
  return value === "rgb" || value === "lab" || value === "hsl";
}

function isClusteringSpace(value: string): value is PatternSettings["clusteringSpace"] {
  return value === "rgb" || value === "lab";
}

function isDownsamplingMode(value: string): value is PatternSettings["downsamplingMode"] {
  return value === "nearest" || value === "gridMode";
}

export function validatePatternDocument(pattern: unknown): PatternDocument {
  if (!isPlainObject(pattern)) {
    throw new Error("Pattern document must be an object.");
  }
  if (pattern.version !== 1) {
    throw new Error("Pattern document has an unsupported version.");
  }
  const width = pattern.width;
  const height = pattern.height;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_PATTERN_SIZE ||
    height > MAX_PATTERN_SIZE
  ) {
    throw new Error("Pattern dimensions must be integers between 1 and 256.");
  }
  if (pattern.paletteBrand !== "mard") {
    throw new Error("Only Mard palette patterns are supported.");
  }
  const cells = pattern.cells;
  if (!Array.isArray(cells) || cells.length !== width * height) {
    throw new Error("Pattern cells length does not match dimensions.");
  }
  for (const cell of cells) {
    if (cell !== null && typeof cell !== "string") {
      throw new Error("Pattern cells must be strings or null.");
    }
  }
  const settings = pattern.settings;
  if (!isPlainObject(settings)) {
    throw new Error("Pattern settings are invalid.");
  }
  const targetColorCount = settings.targetColorCount;
  if (
    typeof targetColorCount !== "number" ||
    !Number.isInteger(targetColorCount) ||
    targetColorCount < 1 ||
    targetColorCount > MARD_PALETTE_MAX
  ) {
    throw new Error("Pattern target color count is invalid.");
  }
  const matchingSpace = settings.matchingSpace;
  const clusteringSpace = settings.clusteringSpace;
  const downsamplingMode = settings.downsamplingMode;
  if (typeof matchingSpace !== "string" || !isMatchingSpace(matchingSpace)) {
    throw new Error("Pattern matching space is invalid.");
  }
  if (typeof clusteringSpace !== "string" || !isClusteringSpace(clusteringSpace)) {
    throw new Error("Pattern clustering space is invalid.");
  }
  if (typeof downsamplingMode !== "string" || !isDownsamplingMode(downsamplingMode)) {
    throw new Error("Pattern downsampling mode is invalid.");
  }

  const normalized: PatternDocument = {
    version: 1,
    width,
    height,
    paletteBrand: "mard",
    cells: [...cells] as PatternCell[],
    settings: {
      targetColorCount,
      matchingSpace,
      clusteringSpace,
      downsamplingMode
    }
  };

  if (pattern.legend !== undefined) {
    if (!Array.isArray(pattern.legend)) {
      throw new Error("Pattern legend is invalid.");
    }
    normalized.legend = pattern.legend.map((item: unknown) => {
      if (!isPlainObject(item)) {
        throw new Error("Pattern legend entry is invalid.");
      }
      const code = item.code;
      const count = item.count;
      if (typeof code !== "string" || typeof count !== "number" || !Number.isInteger(count) || count < 0) {
        throw new Error("Pattern legend entry fields are invalid.");
      }
      return { code, count };
    });
  }

  return normalized;
}

export function validateSavedHistoryEntry(entry: unknown, dimensions: { width: number; height: number }): SavedHistoryEntry {
  if (!isPlainObject(entry)) {
    throw new Error("History entry must be an object.");
  }
  const id = entry.id;
  const labelKey = entry.labelKey;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("History entry id is invalid.");
  }
  if (typeof labelKey !== "string" || !HISTORY_LABEL_KEYS.includes(labelKey as SavedHistoryLabelKey)) {
    throw new Error("History entry label is invalid.");
  }
  const snapshot = validatePatternDocument(entry.pattern);
  if (snapshot.width !== dimensions.width || snapshot.height !== dimensions.height) {
    throw new Error("History snapshot dimensions do not match the pattern.");
  }
  return {
    id,
    labelKey: labelKey as SavedHistoryLabelKey,
    pattern: snapshot
  };
}

export function validatePatternRecord(record: unknown): PatternRecord {
  if (!isPlainObject(record)) {
    throw new Error("Pattern record must be an object.");
  }
  const id = record.id;
  const title = record.title;
  const createdAt = record.createdAt;
  const updatedAt = record.updatedAt;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Pattern record id is invalid.");
  }
  if (typeof title !== "string") {
    throw new Error("Pattern record title is invalid.");
  }
  if (typeof createdAt !== "string" || typeof updatedAt !== "string") {
    throw new Error("Pattern record timestamps are invalid.");
  }

  const pattern = validatePatternDocument(record.pattern);
  const dimensions = { width: pattern.width, height: pattern.height };

  const historyEntries = record.historyEntries;
  if (!Array.isArray(historyEntries) || historyEntries.length === 0) {
    throw new Error("Pattern record history entries are invalid.");
  }
  const normalizedHistory = historyEntries.map((entry) => validateSavedHistoryEntry(entry, dimensions));

  const activeHistoryIndex = record.activeHistoryIndex;
  if (
    typeof activeHistoryIndex !== "number" ||
    !Number.isInteger(activeHistoryIndex) ||
    activeHistoryIndex < 0 ||
    activeHistoryIndex >= normalizedHistory.length
  ) {
    throw new Error("Pattern record active history index is invalid.");
  }

  const storage = record.storage;
  if (!isPlainObject(storage) || storage.provider !== "local") {
    throw new Error("Pattern record storage provider is invalid.");
  }
  const cloudId = storage.cloudId;
  if (cloudId !== undefined && typeof cloudId !== "string") {
    throw new Error("Pattern record cloud id is invalid.");
  }

  return {
    id,
    title,
    createdAt,
    updatedAt,
    pattern,
    historyEntries: normalizedHistory,
    activeHistoryIndex,
    storage: cloudId === undefined ? { provider: "local" } : { provider: "local", cloudId }
  };
}

export function validatePatternLibraryDocument(doc: unknown): PatternLibraryDocument {
  if (!isPlainObject(doc)) {
    throw new Error("Pattern library document must be an object.");
  }
  if (doc.version !== 1) {
    throw new Error("Pattern library has an unsupported version.");
  }
  const patternsRaw = doc.patterns;
  if (!Array.isArray(patternsRaw)) {
    throw new Error("Pattern library patterns must be an array.");
  }
  const patterns = patternsRaw.map((record) => validatePatternRecord(record));
  const ids = new Set<string>();
  for (const record of patterns) {
    if (ids.has(record.id)) {
      throw new Error("Pattern library contains duplicate pattern ids.");
    }
    ids.add(record.id);
  }
  const activePatternId = doc.activePatternId;
  if (activePatternId !== null) {
    if (typeof activePatternId !== "string") {
      throw new Error("Pattern library active pattern id is invalid.");
    }
    if (!ids.has(activePatternId)) {
      throw new Error("Pattern library active pattern id is missing from patterns.");
    }
  } else if (patterns.length > 0) {
    /* allow null with non-empty patterns — caller may fix; or strict? Plan says active pointer. Allow mismatch only when empty */
  }

  return {
    version: 1,
    activePatternId,
    patterns
  };
}

export function serializePatternLibraryDocument(doc: PatternLibraryDocument): string {
  validatePatternLibraryDocument(doc);
  return JSON.stringify(doc);
}

export function parsePatternLibraryDocument(json: string): PatternLibraryDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error("Pattern library JSON could not be parsed.");
  }
  return validatePatternLibraryDocument(parsed);
}

export function loadPatternLibraryFromLocalStorage(): PatternLibraryDocument | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PATTERN_LIBRARY_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    return parsePatternLibraryDocument(raw);
  } catch {
    return null;
  }
}

export function savePatternLibraryToLocalStorage(doc: PatternLibraryDocument): void {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = validatePatternLibraryDocument(doc);
  window.localStorage.setItem(PATTERN_LIBRARY_STORAGE_KEY, serializePatternLibraryDocument(normalized));
}

export function createPatternRecordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function exportPatternRecordToJson(record: PatternRecord): string {
  const payload: PatternRecordExportFile = {
    format: "douloom.patternRecord",
    version: 1,
    exportedAt: new Date().toISOString(),
    record: validatePatternRecord(record)
  };
  return JSON.stringify(payload, null, 2);
}

export function importPatternRecordFromExportJson(json: string, createId: () => string): PatternRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error("Pattern export JSON could not be parsed.");
  }
  if (!isPlainObject(parsed)) {
    throw new Error("Pattern export payload must be an object.");
  }
  if (parsed.format !== "douloom.patternRecord") {
    throw new Error("Pattern export format is not recognized.");
  }
  if (parsed.version !== 1) {
    throw new Error("Pattern export has an unsupported version.");
  }
  const record = validatePatternRecord(parsed.record);
  const now = new Date().toISOString();
  return {
    ...record,
    id: createId(),
    createdAt: now,
    updatedAt: now
  };
}

export function patternDownloadBasename(title: string): string {
  const trimmed = title.trim();
  const slug = trimmed
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 96);
  return slug.length > 0 ? slug : "pattern";
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

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
