"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import type { PatternDocument, PatternSettings } from "@perlerloom/core";
import { mardPalette } from "@perlerloom/palettes";
import { convertImageInWorker } from "@/lib/convert-image-in-worker";
import { createBlankPattern } from "@/lib/create-blank-pattern";
import { EditorWelcome } from "./editor-welcome";
import { GenerateImportDialog, type ResizeMode, type SelectedSourceImage } from "./generate-import-dialog";
import { NewPatternDialog } from "./new-pattern-dialog";
import { PatternEditorWorkspace } from "./pattern-editor-workspace";
import {
  buildImportFormLayoutDefaults,
  clonePattern,
  getTargetDimensions,
  isClusteringSpace,
  isDownsamplingMode,
  isMatchingSpace,
  maxPatternDimension,
  readImageFile
} from "./pattern-editor-utils";

const initialSettings: PatternSettings = {
  targetColorCount: 24,
  matchingSpace: "lab",
  clusteringSpace: "lab",
  downsamplingMode: "nearest",
  ditheringEnabled: false
};

const importSizingReferencePattern: PatternDocument = createBlankPattern(8, 8, initialSettings);

export function PerlerloomApp(): ReactElement {
  const [pattern, setPattern] = useState<PatternDocument | null>(null);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [selectedSourceImage, setSelectedSourceImage] = useState<SelectedSourceImage | null>(null);
  const [importSettings, setImportSettings] = useState<PatternSettings>(initialSettings);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("original");
  const [targetWidthInput, setTargetWidthInput] = useState(String(importSizingReferencePattern.width));
  const [targetHeightInput, setTargetHeightInput] = useState(String(importSizingReferencePattern.height));
  const [scalePercentInput, setScalePercentInput] = useState("100");
  const [targetColorCountInput, setTargetColorCountInput] = useState(String(initialSettings.targetColorCount));
  const [message, setMessage] = useState("Choose an image, preview it, then generate a chart.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [newPatternDialogOpen, setNewPatternDialogOpen] = useState(false);
  const [newPatternDialogKey, setNewPatternDialogKey] = useState(0);

  useEffect(() => {
    return () => {
      if (selectedSourceImage !== null) {
        URL.revokeObjectURL(selectedSourceImage.previewUrl);
      }
    };
  }, [selectedSourceImage]);

  const openImportDialog = useCallback(() => {
    const sizingPattern = pattern ?? importSizingReferencePattern;
    setImportSettings({ ...sizingPattern.settings });
    setTargetColorCountInput(String(sizingPattern.settings.targetColorCount));
    const layout = buildImportFormLayoutDefaults(sizingPattern, selectedSourceImage);
    setResizeMode(layout.resizeMode);
    setTargetWidthInput(layout.targetWidth);
    setTargetHeightInput(layout.targetHeight);
    setScalePercentInput(layout.scalePercent);
    setGenerateDialogOpen(true);
  }, [pattern, selectedSourceImage]);

  const openNewPatternDialog = useCallback(() => {
    setNewPatternDialogKey((key) => key + 1);
    setNewPatternDialogOpen(true);
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

      const sizingPattern = pattern ?? importSizingReferencePattern;
      const layout = buildImportFormLayoutDefaults(sizingPattern, { width: sourceWidth, height: sourceHeight });
      setResizeMode(layout.resizeMode);
      setTargetWidthInput(layout.targetWidth);
      setTargetHeightInput(layout.targetHeight);
      setScalePercentInput(layout.scalePercent);
      setMessage(
        sourceWidth > maxPatternDimension || sourceHeight > maxPatternDimension
          ? "Source is larger than 256 cells. Choose an explicit target size before generating."
          : "Ready to generate without resizing."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image preview failed.");
    }
  }

  async function handleGeneratePattern(): Promise<void> {
    if (selectedSourceImage === null) {
      setMessage("Choose an image before generating.");
      return;
    }

    const targetDimensions = getTargetDimensions(selectedSourceImage, resizeMode, targetWidthInput, targetHeightInput, scalePercentInput);
    if (targetDimensions === null) {
      setMessage("Pattern size could not be computed. Check the fields and try again.");
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
      setMessage("Converting image locally...");
      const image = await readImageFile(selectedSourceImage.file);
      const convertedPattern = await convertImageInWorker({
        ...image,
        settings: settingsForConvert,
        targetWidth: targetDimensions.width,
        targetHeight: targetDimensions.height
      });
      const nextPattern = clonePattern(convertedPattern);
      setPattern(nextPattern);
      setImportSettings(nextPattern.settings);
      setTargetColorCountInput(String(nextPattern.settings.targetColorCount));
      setEditorInstanceKey((key) => key + 1);
      setMessage("Pattern generated locally.");
      setGenerateDialogOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image conversion failed.");
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

  function updateDitheringEnabled(checked: boolean): void {
    setImportSettings((current) => ({ ...current, ditheringEnabled: checked }));
  }

  function handleCreateBlankPattern(width: number, height: number): void {
    const blank = createBlankPattern(width, height, importSettings);
    setPattern(blank);
    setEditorInstanceKey((key) => key + 1);
    setMessage("Empty grid ready—paint with the pencil or pick colors from the palette.");
  }

  const commitPatternUpdate = useCallback((next: PatternDocument | ((previous: PatternDocument) => PatternDocument)): void => {
    setPattern((previous) => {
      if (previous === null) {
        return previous;
      }
      return typeof next === "function" ? next(previous) : next;
    });
  }, []);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8efe3] text-stone-950">
      <header className="shrink-0 border-b border-amber-200 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-sans text-lg font-semibold uppercase tracking-[0.22em] text-amber-700">
              Perlerloom
            </h1>
            <p className="mt-1 max-w-3xl text-xs text-stone-600 md:text-sm">
              Preview an image, choose an explicit size, generate a crisp bead chart, then edit it like a craft worksheet.
            </p>
          </div>
          <p className="max-w-md rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 md:text-sm">
            Everything runs in your browser: import an image, pick size and palette options, then edit the chart locally.
          </p>
        </div>
      </header>

      {pattern === null ? (
        <EditorWelcome onCreateNewPattern={openNewPatternDialog} onImportImage={() => openImportDialog()} />
      ) : (
        <PatternEditorWorkspace
          key={editorInstanceKey}
          pattern={pattern}
          onOpenCreateNewPatternDialog={openNewPatternDialog}
          onOpenImportDialog={openImportDialog}
          onPatternChange={commitPatternUpdate}
          statusMessage={message}
          onStatusMessageChange={setMessage}
        />
      )}

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
        onDitheringEnabledChange={updateDitheringEnabled}
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
