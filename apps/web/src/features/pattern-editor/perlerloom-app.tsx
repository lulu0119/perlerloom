"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { createBlankPattern, type PatternDocument, type PatternSettings } from "@perlerloom/core";
import { mardPalette } from "@perlerloom/palettes";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { publicPath } from "../../../base-path";
import { convertImageInWorker } from "@/lib/convert-image-in-worker";
import { ConversionWorkerFailure } from "@/lib/conversion-worker-failure";
import { EditorWelcome } from "./editor-welcome";
import type { AppStatusMessage } from "./app-status-message";
import { GenerateImportDialog, type ResizeMode, type SelectedSourceImage } from "./generate-import-dialog";
import { LanguageSwitcher } from "./language-switcher";
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
  readImageFile,
  ReadImageFailure
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
  const { t } = useTranslation();
  const [pattern, setPattern] = useState<PatternDocument | null>(null);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
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
      setPattern(nextPattern);
      setImportSettings(nextPattern.settings);
      setTargetColorCountInput(String(nextPattern.settings.targetColorCount));
      setEditorInstanceKey((key) => key + 1);
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

  function updateDitheringEnabled(checked: boolean): void {
    setImportSettings((current) => ({ ...current, ditheringEnabled: checked }));
  }

  function handleCreateBlankPattern(width: number, height: number): void {
    const blank = createBlankPattern(width, height, importSettings);
    setPattern(blank);
    setEditorInstanceKey((key) => key + 1);
    setMessage({ tone: "muted", key: "status.emptyGridReady" });
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
    <main className="bg-background text-foreground flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-border shrink-0 border-b bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Image
              src={publicPath("/android-chrome-192x192.png")}
              alt={t("header.logoAlt")}
              width={48}
              height={48}
              className="border-border h-12 w-12 shrink-0 border bg-white shadow-sm"
            />
            <div className="min-w-0">
              <h1 className="text-brand-accent font-sans text-lg font-semibold uppercase tracking-[0.22em]">{t("meta.title")}</h1>
              <p className="text-muted-foreground mt-1 max-w-3xl text-xs md:text-sm">{t("header.taglinePrimary")}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch md:items-end">
            <LanguageSwitcher />
          </div>
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
