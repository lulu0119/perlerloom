"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { createBlankPattern, type PatternDocument, type PatternSettings } from "@perlerloom/core";
import { mardPalette } from "@perlerloom/palettes";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Button } from "@perlerloom/ui";
import { computePublicBasePath, publicPath } from "../../../base-path";
import { convertImageInWorker } from "@/lib/convert-image-in-worker";
import { ConversionWorkerFailure } from "@/lib/conversion-worker-failure";
import { renderPatternExportToPngBlob } from "@/lib/pattern-export-image";
import {
  createPatternRecordId,
  exportPatternRecordToJson,
  importPatternRecordFromExportJson,
  loadPatternLibraryFromLocalStorage,
  patternDownloadBasename,
  savePatternLibraryToLocalStorage,
  triggerBrowserDownload,
  type PatternLibraryDocument,
  type PatternRecord,
  type SavedHistoryEntry
} from "@/lib/pattern-storage";
import { EditorWelcome } from "./editor-welcome";
import type { AppStatusMessage } from "./app-status-message";
import { GenerateImportDialog, type ResizeMode, type SelectedSourceImage } from "./generate-import-dialog";
import { LanguageSwitcher } from "./language-switcher";
import { NewPatternDialog } from "./new-pattern-dialog";
import { PatternEditorWorkspace } from "./pattern-editor-workspace";
import { PatternLibraryDialog } from "./pattern-library-dialog";
import {
  buildImportFormLayoutDefaults,
  clonePattern,
  createHistoryEntryId,
  getTargetDimensions,
  isClusteringSpace,
  isDownsamplingMode,
  isMatchingSpace,
  maxPatternDimension,
  readImageFile,
  ReadImageFailure,
  type HistoryEntry
} from "./pattern-editor-utils";

function emptyLibrary(): PatternLibraryDocument {
  return {
    version: 1,
    activePatternId: null,
    patterns: []
  };
}

function normalizePatternLibraryDocument(doc: PatternLibraryDocument): PatternLibraryDocument {
  if (doc.patterns.length === 0) {
    return doc.activePatternId === null ? doc : { ...doc, activePatternId: null };
  }
  const exists =
    doc.activePatternId !== null && doc.patterns.some((record) => record.id === doc.activePatternId);
  if (exists) {
    return doc;
  }
  return { ...doc, activePatternId: doc.patterns[0]!.id };
}

const initialSettings: PatternSettings = {
  targetColorCount: 24,
  matchingSpace: "lab",
  clusteringSpace: "lab",
  downsamplingMode: "nearest"
};

const importSizingReferencePattern: PatternDocument = createBlankPattern(8, 8, initialSettings);

function createPatternRecord(pattern: PatternDocument, title: string): PatternRecord {
  const id = createPatternRecordId();
  const now = new Date().toISOString();
  const historyEntries: SavedHistoryEntry[] = [
    {
      id: createHistoryEntryId(),
      labelKey: "history.generatedPattern",
      pattern: clonePattern(pattern)
    }
  ];
  return {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    pattern: clonePattern(pattern),
    historyEntries,
    activeHistoryIndex: 0,
    storage: { provider: "local" }
  };
}

function duplicatePatternRecord(source: PatternRecord, duplicateTitle: string): PatternRecord {
  const now = new Date().toISOString();
  return {
    ...source,
    id: createPatternRecordId(),
    title: duplicateTitle,
    createdAt: now,
    updatedAt: now,
    pattern: clonePattern(source.pattern),
    historyEntries: source.historyEntries.map((entry) => ({
      id: entry.id,
      labelKey: entry.labelKey,
      pattern: clonePattern(entry.pattern)
    })),
    storage: { provider: "local" }
  };
}

export function PerlerloomApp(): ReactElement {
  const { t } = useTranslation();
  const [library, setLibrary] = useState<PatternLibraryDocument>(emptyLibrary);
  const [hydrated, setHydrated] = useState(false);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [selectedSourceImage, setSelectedSourceImage] = useState<SelectedSourceImage | null>(null);
  const [importSettings, setImportSettings] = useState<PatternSettings>(initialSettings);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("original");
  const [targetWidthInput, setTargetWidthInput] = useState(String(importSizingReferencePattern.width));
  const [targetHeightInput, setTargetHeightInput] = useState(String(importSizingReferencePattern.height));
  const [scalePercentInput, setScalePercentInput] = useState("100");
  const [targetColorCountInput, setTargetColorCountInput] = useState(String(initialSettings.targetColorCount));
  const [message, setMessage] = useState<AppStatusMessage>({ tone: "muted", key: "status.importPrompt" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [newPatternDialogOpen, setNewPatternDialogOpen] = useState(false);
  const [newPatternDialogKey, setNewPatternDialogKey] = useState(0);

  const paletteMapForExport = useMemo(() => new Map(mardPalette.map((color) => [color.code, color])), []);

  useEffect(() => {
    return () => {
      if (selectedSourceImage !== null) {
        URL.revokeObjectURL(selectedSourceImage.previewUrl);
      }
    };
  }, [selectedSourceImage]);

  useEffect(() => {
    queueMicrotask(() => {
      const loaded = loadPatternLibraryFromLocalStorage();
      if (loaded !== null && loaded.patterns.length > 0) {
        setLibrary(normalizePatternLibraryDocument(loaded));
      }
      setHydrated(true);
    });
  }, []);

  const persistedLibrary = useMemo(() => normalizePatternLibraryDocument(library), [library]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      savePatternLibraryToLocalStorage(persistedLibrary);
    } catch {
      queueMicrotask(() => {
        setMessage({ tone: "accent", key: "status.librarySaveFailed" });
      });
    }
  }, [hydrated, persistedLibrary]);

  const activeRecord = useMemo(() => {
    const patterns = persistedLibrary.patterns;
    if (patterns.length === 0) {
      return null;
    }
    const preferredId = persistedLibrary.activePatternId;
    if (preferredId !== null) {
      const match = patterns.find((record) => record.id === preferredId);
      if (match !== undefined) {
        return match;
      }
    }
    return patterns[0] ?? null;
  }, [persistedLibrary.activePatternId, persistedLibrary.patterns]);

  const editorPattern =
    activeRecord === null
      ? null
      : clonePattern(activeRecord.historyEntries[activeRecord.activeHistoryIndex]?.pattern ?? activeRecord.pattern);

  const initialHistoryEntries =
    activeRecord === null
      ? undefined
      : activeRecord.historyEntries.map((entry) => ({
          id: entry.id,
          labelKey: entry.labelKey,
          pattern: clonePattern(entry.pattern)
        }));

  const initialActiveHistoryIndex = activeRecord?.activeHistoryIndex ?? 0;

  const openImportDialog = useCallback(() => {
    const sizingPattern = activeRecord?.pattern ?? importSizingReferencePattern;
    setImportSettings({ ...sizingPattern.settings });
    setTargetColorCountInput(String(sizingPattern.settings.targetColorCount));
    const layout = buildImportFormLayoutDefaults(sizingPattern, selectedSourceImage);
    setResizeMode(layout.resizeMode);
    setTargetWidthInput(layout.targetWidth);
    setTargetHeightInput(layout.targetHeight);
    setScalePercentInput(layout.scalePercent);
    setGenerateDialogOpen(true);
  }, [activeRecord?.pattern, selectedSourceImage]);

  const openNewPatternDialog = useCallback(() => {
    setNewPatternDialogKey((key) => key + 1);
    setNewPatternDialogOpen(true);
  }, []);

  const handleExportPatternJson = useCallback(
    (patternId: string) => {
      const record = library.patterns.find((item) => item.id === patternId);
      if (record === undefined) {
        return;
      }
      const json = exportPatternRecordToJson(record);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      triggerBrowserDownload(blob, `${patternDownloadBasename(record.title)}.json`);
    },
    [library.patterns]
  );

  const handleExportPatternPng = useCallback(
    async (patternId: string) => {
      const record = library.patterns.find((item) => item.id === patternId);
      if (record === undefined) {
        return;
      }
      try {
        const siteUrl = `${window.location.origin}${computePublicBasePath()}`.replace(/\/$/u, "") || window.location.origin;
        const blob = await renderPatternExportToPngBlob(record.pattern, paletteMapForExport, {
          siteTitle: t("meta.title"),
          siteUrl,
          siteDescription: t("meta.description"),
          logoSrc: publicPath("/android-chrome-192x192.png")
        });
        triggerBrowserDownload(blob, `${patternDownloadBasename(record.title)}.png`);
      } catch {
        setMessage({ tone: "accent", key: "status.exportPngFailed" });
      }
    },
    [library.patterns, paletteMapForExport, t]
  );

  const handleImportPatternJsonFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const imported = importPatternRecordFromExportJson(text, createPatternRecordId);
        setLibrary((previous) => ({
          version: 1,
          activePatternId: imported.id,
          patterns: [...previous.patterns, imported]
        }));
        setEditorResetKey((key) => key + 1);
        setLibraryDialogOpen(false);
        setGenerateDialogOpen(false);
        setMessage({ tone: "muted", key: "status.patternImported" });
      } catch {
        setMessage({ tone: "accent", key: "status.patternImportInvalid" });
      }
    },
    []
  );

  const handleRenamePattern = useCallback((patternId: string, title: string) => {
    setLibrary((previous) => ({
      ...previous,
      patterns: previous.patterns.map((record) =>
        record.id === patternId ? { ...record, title, updatedAt: new Date().toISOString() } : record
      )
    }));
  }, []);

  const handleDuplicatePattern = useCallback(
    (patternId: string) => {
      const source = library.patterns.find((record) => record.id === patternId);
      if (source === undefined) {
        return;
      }
      const duplicateTitle = `${source.title} (${t("library.duplicatedTitleSuffix")})`;
      const copy = duplicatePatternRecord(source, duplicateTitle);
      setLibrary((previous) => ({
        ...previous,
        activePatternId: copy.id,
        patterns: [...previous.patterns, copy]
      }));
      setEditorResetKey((key) => key + 1);
    },
    [library.patterns, t]
  );

  const handleDeletePattern = useCallback((patternId: string) => {
    setLibrary((previous) => {
      const patterns = previous.patterns.filter((record) => record.id !== patternId);
      let activePatternId = previous.activePatternId;
      if (activePatternId === patternId) {
        activePatternId = patterns[0]?.id ?? null;
      }
      return { ...previous, patterns, activePatternId };
    });
  }, []);

  const handleOpenPattern = useCallback((patternId: string) => {
    setLibrary((previous) => ({ ...previous, activePatternId: patternId }));
    setEditorResetKey((key) => key + 1);
    setLibraryDialogOpen(false);
  }, []);

  async function handleSelectedFile(file: File): Promise<void> {
    try {
      const bitmap = await createImageBitmap(file);
      const sourceWidth = bitmap.width;
      const sourceHeight = bitmap.height;
      bitmap.close?.();
      const previewUrl = URL.createObjectURL(file);

      setSelectedSourceImage((current) => {
        if (current !== null) {
          URL.revokeObjectURL(current.previewUrl);
        }
        return { file, previewUrl, width: sourceWidth, height: sourceHeight };
      });

      const sizingPattern = activeRecord?.pattern ?? importSizingReferencePattern;
      const layout = buildImportFormLayoutDefaults(sizingPattern, { width: sourceWidth, height: sourceHeight });
      setResizeMode(layout.resizeMode);
      setTargetWidthInput(layout.targetWidth);
      setTargetHeightInput(layout.targetHeight);
      setScalePercentInput(layout.scalePercent);
      setMessage(
        sourceWidth > maxPatternDimension || sourceHeight > maxPatternDimension
          ? { tone: "accent", key: "status.sourceTooLarge", params: { max: maxPatternDimension } }
          : { tone: "muted", key: "status.readyNoResize" }
      );
    } catch (error) {
      if (error instanceof ReadImageFailure) {
        setMessage({ tone: "accent", key: "errors.readImageCanvasUnavailable" });
      } else {
        setMessage({ tone: "accent", key: "status.imagePreviewFailed" });
      }
    }
  }

  async function handleGeneratePattern(): Promise<void> {
    if (selectedSourceImage === null) {
      setMessage({ tone: "accent", key: "status.chooseImageBeforeGenerate" });
      return;
    }

    const targetDimensions = getTargetDimensions(selectedSourceImage, resizeMode, targetWidthInput, targetHeightInput, scalePercentInput);
    if (targetDimensions === null) {
      setMessage({ tone: "accent", key: "status.sizeComputeFailed" });
      return;
    }

    const trimmedColors = targetColorCountInput.trim();
    const parsedColors = Number(trimmedColors);
    const targetColorCount =
      trimmedColors !== "" && Number.isInteger(parsedColors) && parsedColors >= 1 && parsedColors <= mardPalette.length
        ? parsedColors
        : importSettings.targetColorCount;
    const settingsForConvert: PatternSettings = { ...importSettings, targetColorCount };

    try {
      setIsGenerating(true);
      setMessage({ tone: "muted", key: "status.converting" });
      const image = await readImageFile(selectedSourceImage.file);
      const convertedPattern = await convertImageInWorker({
        ...image,
        settings: settingsForConvert,
        targetWidth: targetDimensions.width,
        targetHeight: targetDimensions.height
      });
      const nextPattern = clonePattern(convertedPattern);
      const record = createPatternRecord(nextPattern, t("library.importedTitle"));
      setLibrary((previous) => ({
        version: 1,
        activePatternId: record.id,
        patterns: [...previous.patterns, record]
      }));
      setImportSettings(nextPattern.settings);
      setTargetColorCountInput(String(nextPattern.settings.targetColorCount));
      setEditorResetKey((key) => key + 1);
      setMessage({ tone: "muted", key: "status.patternGenerated" });
      setGenerateDialogOpen(false);
    } catch (error) {
      if (error instanceof ConversionWorkerFailure) {
        if (error.code === "rgb_buffer_mismatch") {
          setMessage({ tone: "accent", key: "errors.conversionRgbBufferMismatch" });
        } else {
          setMessage({ tone: "accent", key: "errors.conversionFailed" });
        }
      } else if (error instanceof ReadImageFailure) {
        setMessage({ tone: "accent", key: "errors.readImageCanvasUnavailable" });
      } else {
        setMessage({ tone: "accent", key: "status.imageConversionFailed" });
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    if (file !== undefined) {
      void handleSelectedFile(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file !== undefined) {
      void handleSelectedFile(file);
    }
  }

  function handleTargetColorCountInputChange(value: string): void {
    if (value === "") {
      setTargetColorCountInput("");
      return;
    }
    if (!/^\d+$/.test(value)) {
      return;
    }
    setTargetColorCountInput(value);
  }

  function handleTargetColorCountInputBlur(): void {
    const trimmed = targetColorCountInput.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isInteger(parsed) || parsed < 1 || parsed > mardPalette.length) {
      setTargetColorCountInput(String(importSettings.targetColorCount));
      return;
    }
    setImportSettings((current) => ({ ...current, targetColorCount: parsed }));
    setTargetColorCountInput(String(parsed));
  }

  function updateMatchingSpace(value: string): void {
    if (isMatchingSpace(value)) {
      setImportSettings((current) => ({ ...current, matchingSpace: value }));
    }
  }

  function updateClusteringSpace(value: string): void {
    if (isClusteringSpace(value)) {
      setImportSettings((current) => ({ ...current, clusteringSpace: value }));
    }
  }

  function updateDownsamplingMode(value: string): void {
    if (isDownsamplingMode(value)) {
      setImportSettings((current) => ({ ...current, downsamplingMode: value }));
    }
  }

  function handleCreateBlankPattern(width: number, height: number): void {
    const blank = createBlankPattern(width, height, importSettings);
    const record = createPatternRecord(blank, t("library.defaultTitle"));
    setLibrary((previous) => ({
      version: 1,
      activePatternId: record.id,
      patterns: [...previous.patterns, record]
    }));
    setEditorResetKey((key) => key + 1);
    setNewPatternDialogOpen(false);
    setMessage({ tone: "muted", key: "status.emptyGridReady" });
  }

  const commitPatternUpdate = useCallback((next: PatternDocument | ((previous: PatternDocument) => PatternDocument)): void => {
    setLibrary((previousLibrary) => {
      const activeId = previousLibrary.activePatternId;
      if (activeId === null) {
        return previousLibrary;
      }
      return {
        ...previousLibrary,
        patterns: previousLibrary.patterns.map((record) => {
          if (record.id !== activeId) {
            return record;
          }
          const resolved = typeof next === "function" ? next(record.pattern) : next;
          return {
            ...record,
            pattern: clonePattern(resolved),
            updatedAt: new Date().toISOString()
          };
        })
      };
    });
  }, []);

  const handleHistoryStateChange = useCallback((entries: HistoryEntry[], activeHistoryIndex: number): void => {
    setLibrary((previousLibrary) => {
      const activeId = previousLibrary.activePatternId;
      if (activeId === null) {
        return previousLibrary;
      }
      return {
        ...previousLibrary,
        patterns: previousLibrary.patterns.map((record) => {
          if (record.id !== activeId) {
            return record;
          }
          const saved: SavedHistoryEntry[] = entries.map((entry) => ({
            id: entry.id,
            labelKey: entry.labelKey as SavedHistoryEntry["labelKey"],
            pattern: clonePattern(entry.pattern)
          }));
          const present = saved[activeHistoryIndex]?.pattern;
          if (present === undefined) {
            return record;
          }
          return {
            ...record,
            pattern: clonePattern(present),
            historyEntries: saved,
            activeHistoryIndex,
            updatedAt: new Date().toISOString()
          };
        })
      };
    });
  }, []);

  const showWelcome = library.patterns.length === 0;
  const showEditor = editorPattern !== null && initialHistoryEntries !== undefined;

  return (
    <main className="bg-background text-foreground flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-border shrink-0 border-b bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Image
              src={publicPath("/android-chrome-192x192.png")}
              alt={t("header.logoAlt")}
              width={52}
              height={52}
              className="h-[52px] w-[52px] shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-brand-accent font-sans text-lg font-semibold uppercase tracking-[0.22em]">{t("meta.title")}</h1>
              <p className="text-muted-foreground mt-1 max-w-3xl text-xs md:text-sm">{t("header.taglinePrimary")}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-end">
            <Button
              className="w-full md:w-auto"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLibraryDialogOpen(true)}
            >
              {t("header.openLibrary")}
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {showWelcome ? (
        <EditorWelcome
          onCreateNewPattern={openNewPatternDialog}
          onImportImage={() => openImportDialog()}
          onImportPatternJson={(file) => handleImportPatternJsonFile(file)}
          onOpenLibrary={() => setLibraryDialogOpen(true)}
        />
      ) : null}

      {showEditor ? (
        <PatternEditorWorkspace
          key={`${persistedLibrary.activePatternId ?? "none"}-${String(editorResetKey)}`}
          initialActiveHistoryIndex={initialActiveHistoryIndex}
          initialHistoryEntries={initialHistoryEntries}
          pattern={editorPattern}
          statusMessage={message}
          onExportJson={() => handleExportPatternJson(persistedLibrary.activePatternId!)}
          onExportPng={() => void handleExportPatternPng(persistedLibrary.activePatternId!)}
          onHistoryStateChange={handleHistoryStateChange}
          onOpenCreateNewPatternDialog={openNewPatternDialog}
          onOpenImportDialog={openImportDialog}
          onOpenLibrary={() => setLibraryDialogOpen(true)}
          onPatternChange={commitPatternUpdate}
          onStatusMessageChange={setMessage}
        />
      ) : null}

      <PatternLibraryDialog
        activePatternId={persistedLibrary.activePatternId}
        open={libraryDialogOpen}
        patterns={library.patterns}
        onDeletePattern={handleDeletePattern}
        onDuplicatePattern={handleDuplicatePattern}
        onExportJson={handleExportPatternJson}
        onExportPng={(id) => void handleExportPatternPng(id)}
        onImportJsonFile={(file) => handleImportPatternJsonFile(file)}
        onOpenChange={setLibraryDialogOpen}
        onOpenPattern={handleOpenPattern}
        onRenamePattern={handleRenamePattern}
      />

      <GenerateImportDialog
        importSettings={importSettings}
        isGenerating={isGenerating}
        maxPatternDimension={maxPatternDimension}
        message={message}
        open={generateDialogOpen}
        resizeMode={resizeMode}
        scalePercentInput={scalePercentInput}
        selectedSourceImage={selectedSourceImage}
        targetColorCountInput={targetColorCountInput}
        targetHeightInput={targetHeightInput}
        targetWidthInput={targetWidthInput}
        onClusteringSpaceChange={updateClusteringSpace}
        onDownsamplingModeChange={updateDownsamplingMode}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
        onGenerate={() => void handleGeneratePattern()}
        onMatchingSpaceChange={updateMatchingSpace}
        onOpenChange={setGenerateDialogOpen}
        onResizeModeChange={setResizeMode}
        onScalePercentInputChange={setScalePercentInput}
        onTargetColorCountInputBlur={handleTargetColorCountInputBlur}
        onTargetColorCountInputChange={handleTargetColorCountInputChange}
        onTargetHeightInputChange={setTargetHeightInput}
        onTargetWidthInputChange={setTargetWidthInput}
        onImportPatternJson={handleImportPatternJsonFile}
      />

      <NewPatternDialog
        key={`new-pattern-dialog-${String(newPatternDialogKey)}`}
        maxDimension={maxPatternDimension}
        open={newPatternDialogOpen}
        onConfirm={handleCreateBlankPattern}
        onOpenChange={setNewPatternDialogOpen}
      />
    </main>
  );
}
