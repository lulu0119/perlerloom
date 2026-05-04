"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Hand, ImagePlus, Layers, Minus, PaintBucket, Pencil, Pipette, Save, Share2, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import {
  bucketFillPattern,
  buildLegend,
  deletePatternColor,
  drawPatternLine,
  readableTextHexOnBackgroundHex,
  replacePatternColor,
  type ClusteringSpace,
  type DownsamplingMode,
  type MatchingSpace,
  type PatternDocument,
  type PatternPoint,
  type PatternSettings
} from "@perlerloom/core";
import { mardPalette } from "@perlerloom/palettes";
import { cn } from "@perlerloom/ui";
import QRCode from "qrcode";
import { convertImageInWorker } from "@/lib/convert-image-in-worker";
import { majorGridLineCellIndices } from "@/lib/major-grid-line-indices";
import { createExportMetadata } from "@/lib/pattern-storage";
import { EditorSidePanels } from "./editor-side-panels";
import { ChartToolHud } from "./chart-tool-hud";
import { GenerateImportDialog, type ResizeMode, type SelectedSourceImage } from "./generate-import-dialog";

type EditorTool = "pencil" | "eyedropper" | "paintBucket" | "hand" | "line";

type HistoryEntry = {
  id: string;
  label: string;
  pattern: PatternDocument;
};

type CanvasLayout = {
  cellSize: number;
  headerSize: number;
  width: number;
  height: number;
};

const maxPatternDimension = 256;
const baseCellSize = 28;
const baseHeaderSize = 32;
const maxHistoryEntries = 24;

const toolLabels: Record<EditorTool, string> = {
  pencil: "Pencil",
  eyedropper: "Eyedropper",
  paintBucket: "Paint Bucket",
  hand: "Hand",
  line: "Line"
};

const initialSettings: PatternSettings = {
  targetColorCount: 24,
  matchingSpace: "lab",
  clusteringSpace: "lab",
  downsamplingMode: "nearest",
  ditheringEnabled: false
};

const initialCells = Array.from({ length: 64 }, (_, index) => (index % 3 === 0 ? "H7" : index % 3 === 1 ? "T1" : "A1"));

const initialPattern: PatternDocument = {
  version: 1,
  width: 8,
  height: 8,
  paletteBrand: "mard",
  cells: initialCells,
  settings: initialSettings,
  legend: buildLegend(initialCells)
};

const initialHistoryEntry: HistoryEntry = {
  id: "initial-pattern",
  label: "Generated pattern",
  pattern: clonePattern(initialPattern)
};

export function PerlerloomApp(): React.ReactElement {
  const [settings, setSettings] = useState<PatternSettings>(initialSettings);
  const [pattern, setPattern] = useState<PatternDocument>(initialPattern);
  const [selectedSourceImage, setSelectedSourceImage] = useState<SelectedSourceImage | null>(null);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("original");
  const [targetWidthInput, setTargetWidthInput] = useState(String(initialPattern.width));
  const [targetHeightInput, setTargetHeightInput] = useState(String(initialPattern.height));
  const [scalePercentInput, setScalePercentInput] = useState("100");
  const [activeTool, setActiveTool] = useState<EditorTool>("pencil");
  const [activeColor, setActiveColor] = useState("H7");
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState("Choose an image, preview it, then generate a chart.");
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([initialHistoryEntry]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);
  const [lineStartPoint, setLineStartPoint] = useState<PatternPoint | null>(null);
  const [linePreviewPoint, setLinePreviewPoint] = useState<PatternPoint | null>(null);
  const [eyedropperHoverCell, setEyedropperHoverCell] = useState<PatternPoint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthenticated] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [mobileSidePanelOpen, setMobileSidePanelOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const handPanRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const pencilStrokeActiveRef = useRef(false);
  const pencilLastCellRef = useRef<PatternPoint | null>(null);
  const pencilStrokeLatestRef = useRef<PatternDocument | null>(null);

  const paletteByCode = useMemo(() => new Map(mardPalette.map((color) => [color.code, color])), []);
  const legend = pattern.legend ?? buildLegend(pattern.cells);
  const canvasLayout = useMemo(() => createCanvasLayout(pattern, zoom), [pattern, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    drawPatternCanvas(canvas, pattern, paletteByCode, canvasLayout, lineStartPoint, linePreviewPoint);
  }, [canvasLayout, linePreviewPoint, lineStartPoint, paletteByCode, pattern]);

  useEffect(() => {
    return () => {
      if (selectedSourceImage !== null) {
        URL.revokeObjectURL(selectedSourceImage.previewUrl);
      }
    };
  }, [selectedSourceImage]);

  useEffect(() => {
    if (!mobileSidePanelOpen) {
      return;
    }
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMobileSidePanelOpen(false);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileSidePanelOpen]);

  function selectActiveTool(nextTool: EditorTool): void {
    setActiveTool(nextTool);
    if (nextTool !== "eyedropper") {
      setEyedropperHoverCell(null);
    }
  }

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

      const suggestedSize = suggestTargetSize(sourceWidth, sourceHeight);
      setTargetWidthInput(String(suggestedSize.width));
      setTargetHeightInput(String(suggestedSize.height));
      setScalePercentInput(String(suggestedSize.scalePercent));
      setResizeMode(sourceWidth > maxPatternDimension || sourceHeight > maxPatternDimension ? "dimensions" : "original");
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
      setMessage("Choose target dimensions from 1 to 256 cells.");
      return;
    }

    try {
      setIsGenerating(true);
      setMessage("Converting image locally...");
      const image = await readImageFile(selectedSourceImage.file);
      const convertedPattern = await convertImageInWorker({
        ...image,
        settings,
        targetWidth: targetDimensions.width,
        targetHeight: targetDimensions.height
      });
      const nextPattern = clonePattern(convertedPattern);
      setPattern(nextPattern);
      setActiveColor(nextPattern.legend?.[0]?.code ?? "H7");
      resetHistory(nextPattern, "Generated pattern");
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

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>): void {
    const point = canvasPointToPatternPoint(event.currentTarget, event.clientX, event.clientY, pattern, canvasLayout);
    if (point === null) {
      return;
    }

    if (activeTool === "eyedropper") {
      const index = point.row * pattern.width + point.column;
      const code = pattern.cells[index];
      if (code === null) {
        setMessage("That cell is empty—no bead color to pick.");
        return;
      }
      setActiveColor(code);
      return;
    }

    if (activeTool === "paintBucket") {
      applyPatternEdit("Bucket fill", bucketFillPattern(pattern, point, activeColor));
    }
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (activeTool === "hand") {
      const container = chartScrollRef.current;
      if (container !== null) {
        handPanRef.current = {
          clientX: event.clientX,
          clientY: event.clientY,
          scrollLeft: container.scrollLeft,
          scrollTop: container.scrollTop
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }

    if (activeTool === "pencil") {
      if (event.button !== 0) {
        return;
      }
      const point = canvasPointToPatternPoint(event.currentTarget, event.clientX, event.clientY, pattern, canvasLayout);
      if (point === null) {
        return;
      }
      pencilStrokeActiveRef.current = true;
      pencilLastCellRef.current = point;
      event.currentTarget.setPointerCapture(event.pointerId);
      setPattern((currentPattern) => {
        const next = drawPatternLine(currentPattern, point, point, activeColor);
        pencilStrokeLatestRef.current = next;
        return clonePattern(next);
      });
      return;
    }

    if (activeTool === "line") {
      const point = canvasPointToPatternPoint(event.currentTarget, event.clientX, event.clientY, pattern, canvasLayout);
      setLineStartPoint(point);
      setLinePreviewPoint(point);
    }
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (activeTool === "hand") {
      const panState = handPanRef.current;
      const container = chartScrollRef.current;
      if (panState !== null && container !== null) {
        container.scrollLeft = panState.scrollLeft - (event.clientX - panState.clientX);
        container.scrollTop = panState.scrollTop - (event.clientY - panState.clientY);
      }
      return;
    }

    if (activeTool === "line" && lineStartPoint !== null) {
      setLinePreviewPoint(canvasPointToPatternPoint(event.currentTarget, event.clientX, event.clientY, pattern, canvasLayout));
    }

    if (activeTool === "pencil" && pencilStrokeActiveRef.current) {
      const canvas = event.currentTarget;
      if (canvas === null) {
        return;
      }
      const clientX = event.clientX;
      const clientY = event.clientY;
      setPattern((currentPattern) => {
        const current = canvasPointToPatternPoint(canvas, clientX, clientY, currentPattern, canvasLayout);
        const last = pencilLastCellRef.current;
        if (current === null || last === null) {
          return currentPattern;
        }
        if (current.column === last.column && current.row === last.row) {
          return currentPattern;
        }
        const next = drawPatternLine(currentPattern, last, current, activeColor);
        pencilLastCellRef.current = current;
        pencilStrokeLatestRef.current = next;
        return clonePattern(next);
      });
    }

    if (activeTool === "eyedropper") {
      const canvas = event.currentTarget;
      const point = canvasPointToPatternPoint(canvas, event.clientX, event.clientY, pattern, canvasLayout);
      setEyedropperHoverCell((previous) => {
        if (point === null && previous === null) {
          return previous;
        }
        if (
          point !== null &&
          previous !== null &&
          point.row === previous.row &&
          point.column === previous.column
        ) {
          return previous;
        }
        return point;
      });
    }
  }

  function finishPencilStrokeIfActive(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!pencilStrokeActiveRef.current) {
      return;
    }
    pencilStrokeActiveRef.current = false;
    pencilLastCellRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer capture may already be released */
    }
    const snapshot = pencilStrokeLatestRef.current;
    pencilStrokeLatestRef.current = null;
    if (snapshot !== null) {
      appendHistory("Pencil stroke", clonePattern(snapshot));
    }
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLCanvasElement>): void {
    finishPencilStrokeIfActive(event);

    if (activeTool === "hand") {
      handPanRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "line" && lineStartPoint !== null && linePreviewPoint !== null) {
      applyPatternEdit("Line", drawPatternLine(pattern, lineStartPoint, linePreviewPoint, activeColor));
    }
    setLineStartPoint(null);
    setLinePreviewPoint(null);
  }

  function handleSave(): void {
    if (!isAuthenticated) {
      setMessage("Sign in to save patterns to the cloud.");
      return;
    }
    setMessage("Pattern saved.");
  }

  function handleUndo(): void {
    if (activeHistoryIndex === 0) {
      setMessage("No edits to undo.");
      return;
    }
    jumpToHistory(activeHistoryIndex - 1);
  }

  function handleRedo(): void {
    if (activeHistoryIndex >= historyEntries.length - 1) {
      setMessage("No edits to redo.");
      return;
    }
    jumpToHistory(activeHistoryIndex + 1);
  }

  async function handleCreateShare(): Promise<void> {
    const shareUrl = "https://perlerloom.app/share/local-preview";
    const metadata = createExportMetadata(shareUrl);
    setShareQrDataUrl(await QRCode.toDataURL(metadata.qrPayload));
    setMessage(`Share export includes attribution: ${metadata.attributionUrl}`);
  }

  function applyPatternEdit(label: string, editedPattern: PatternDocument): void {
    const nextPattern = clonePattern(editedPattern);
    setPattern(nextPattern);
    appendHistory(label, nextPattern);
  }

  function resetHistory(nextPattern: PatternDocument, label: string): void {
    setHistoryEntries([{ id: createHistoryId(label), label, pattern: clonePattern(nextPattern) }]);
    setActiveHistoryIndex(0);
  }

  function appendHistory(label: string, nextPattern: PatternDocument): void {
    setHistoryEntries((currentEntries) => {
      const activeEntries = currentEntries.slice(0, activeHistoryIndex + 1);
      const nextEntries = [...activeEntries, { id: createHistoryId(label), label, pattern: clonePattern(nextPattern) }].slice(-maxHistoryEntries);
      setActiveHistoryIndex(nextEntries.length - 1);
      return nextEntries;
    });
  }

  function jumpToHistory(index: number): void {
    const entry = historyEntries[index];
    if (entry === undefined) {
      return;
    }
    setPattern(clonePattern(entry.pattern));
    setActiveHistoryIndex(index);
    setMessage(`Restored: ${entry.label}.`);
  }

  function updateTargetColorCount(value: string): void {
    const targetColorCount = Number(value);
    if (Number.isInteger(targetColorCount) && targetColorCount >= 1 && targetColorCount <= mardPalette.length) {
      setSettings((current) => ({ ...current, targetColorCount }));
    }
  }

  function updateMatchingSpace(value: string): void {
    if (isMatchingSpace(value)) {
      setSettings((current) => ({ ...current, matchingSpace: value }));
    }
  }

  function updateClusteringSpace(value: string): void {
    if (isClusteringSpace(value)) {
      setSettings((current) => ({ ...current, clusteringSpace: value }));
    }
  }

  function updateDownsamplingMode(value: string): void {
    if (isDownsamplingMode(value)) {
      setSettings((current) => ({ ...current, downsamplingMode: value }));
    }
  }

  function updateDitheringEnabled(checked: boolean): void {
    setSettings((current) => ({ ...current, ditheringEnabled: checked }));
  }

  const toolRailButtonClassName =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-stone-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-800";
  const canvasCursorClassName = getCanvasCursorClassName(activeTool);

  const sidePanelContent = (
    <EditorSidePanels
      activeColor={activeColor}
      activeHistoryIndex={activeHistoryIndex}
      historyEntries={historyEntries}
      legend={legend}
      paletteByCode={paletteByCode}
      onActiveColorChange={setActiveColor}
      onApplyDelete={(fromCode) => applyPatternEdit("Delete", deletePatternColor(pattern, fromCode))}
      onApplyReplace={(fromCode) => applyPatternEdit("Replace", replacePatternColor(pattern, fromCode, activeColor))}
      onJumpToHistory={jumpToHistory}
      onRedo={handleRedo}
      onUndo={handleUndo}
    />
  );

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
            Local conversion is free. AI cleanup lives in the import flow; hosted accounts are not part of this MVP.
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          aria-label="Editor tools"
          className="flex shrink-0 flex-row items-center gap-1 overflow-x-auto border-b border-amber-200 bg-white/95 px-2 py-1.5 md:w-14 md:flex-col md:items-center md:overflow-y-auto md:overflow-x-visible md:border-b-0 md:border-r md:px-0 md:py-2"
        >
          {(Object.keys(toolLabels) as EditorTool[]).map((tool) => {
            const Icon = getToolIcon(tool);
            return (
              <button
                aria-current={activeTool === tool ? "true" : undefined}
                aria-label={toolLabels[tool]}
                className={cn(toolRailButtonClassName, activeTool === tool ? "border-amber-700 bg-amber-100 text-amber-950" : "border-stone-200 bg-white hover:bg-stone-50 md:hover:bg-stone-50")}
                key={tool}
                title={toolLabels[tool]}
                type="button"
                onClick={() => selectActiveTool(tool)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            );
          })}
          <div className="mx-1 hidden h-px w-8 shrink-0 bg-stone-200 md:my-1 md:block" role="presentation" />
          <button
            aria-label="New / Import"
            className={cn(toolRailButtonClassName, "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100")}
            title="New / Import"
            type="button"
            onClick={() => setGenerateDialogOpen(true)}
          >
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </button>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f1eadf] md:bg-[#f8efe3]">
            <div className="flex shrink-0 flex-col gap-1 border-b border-stone-200/80 bg-white/90 px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Generated chart preview</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <ChartToolHud
                    activeColor={activeColor}
                    activeTool={activeTool}
                    eyedropperHoverCell={eyedropperHoverCell}
                    onActiveColorChange={setActiveColor}
                    paletteByCode={paletteByCode}
                    pattern={pattern}
                  />
                </div>
                <label className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-stone-300 bg-white px-2 text-xs font-medium text-stone-700">
                  <span className="sr-only">Chart zoom</span>
                  <ZoomOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <select
                    aria-label="Chart zoom"
                    className="max-h-6 min-h-0 max-w-[4.5rem] shrink-0 cursor-pointer appearance-none border-0 bg-transparent py-0 text-xs font-semibold leading-none outline-none"
                    value={String(zoom)}
                    onChange={(event) => {
                      const nextZoom = Number(event.currentTarget.value);
                      if (Number.isFinite(nextZoom)) {
                        setZoom(clampZoom(nextZoom));
                      }
                    }}
                  >
                    <option value="0.5">50%</option>
                    <option value="0.75">75%</option>
                    <option value="1">100%</option>
                    <option value="1.25">125%</option>
                    <option value="1.5">150%</option>
                    <option value="2">200%</option>
                  </select>
                  <ZoomIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </label>
                <button
                  aria-label="Save to cloud"
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-stone-950 px-2.5 text-xs font-semibold text-white md:px-3"
                  type="button"
                  onClick={handleSave}
                >
                  <Save className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  aria-label="Create share QR"
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-stone-300 bg-white px-2.5 text-xs font-semibold md:px-3"
                  type="button"
                  onClick={() => void handleCreateShare()}
                >
                  <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                {shareQrDataUrl !== null ? (
                  <Image
                    alt="Perlerloom share QR code"
                    className="h-8 w-8 shrink-0 rounded-lg border border-stone-200 p-0.5"
                    height={48}
                    src={shareQrDataUrl}
                    unoptimized
                    width={48}
                  />
                ) : null}
              </div>
            </div>

            {!generateDialogOpen ? (
              <p className="line-clamp-2 border-b border-stone-200/80 bg-stone-100/90 px-2 py-1 text-xs text-stone-700 md:text-sm" role="status">
                {message}
              </p>
            ) : null}

            <div ref={chartScrollRef} className="min-h-0 flex-1 overflow-auto p-2 md:p-3">
              <canvas
                aria-label="Editable bead pattern"
                className={cn("block rounded-lg bg-white shadow-sm", canvasCursorClassName)}
                height={canvasLayout.height}
                ref={canvasRef}
                width={canvasLayout.width}
                onClick={handleCanvasClick}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerLeave={() => {
                  setEyedropperHoverCell(null);
                }}
                onPointerCancel={finishPencilStrokeIfActive}
                onPointerUp={handleCanvasPointerUp}
                onLostPointerCapture={finishPencilStrokeIfActive}
              />
            </div>
          </div>
        </div>

        <aside
          className="hidden min-h-0 w-[300px] shrink-0 flex-col overflow-y-auto overscroll-contain border-l border-amber-200 bg-white/95 p-3 md:flex"
          aria-label="Palette and history"
        >
          {sidePanelContent}
        </aside>
      </div>

      <button
        aria-expanded={mobileSidePanelOpen}
        aria-haspopup="dialog"
        aria-label="Open palette and history"
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-950 shadow-lg md:hidden"
        type="button"
        onClick={() => setMobileSidePanelOpen(true)}
      >
        <Layers className="h-6 w-6" aria-hidden="true" />
      </button>

      {mobileSidePanelOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Dismiss palette and history"
            className="absolute inset-0 bg-black/40"
            type="button"
            onClick={() => setMobileSidePanelOpen(false)}
          />
          <div
            aria-label="Palette and history"
            className="absolute bottom-0 left-0 right-0 flex max-h-[78dvh] flex-col overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-200 bg-white p-3 shadow-2xl"
            role="dialog"
          >
            <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-stone-300" role="presentation" />
            {sidePanelContent}
          </div>
        </div>
      ) : null}

      <GenerateImportDialog
        isGenerating={isGenerating}
        maxPatternDimension={maxPatternDimension}
        message={message}
        open={generateDialogOpen}
        resizeMode={resizeMode}
        scalePercentInput={scalePercentInput}
        selectedSourceImage={selectedSourceImage}
        settings={settings}
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
        onTargetColorCountChange={updateTargetColorCount}
        onTargetHeightInputChange={setTargetHeightInput}
        onTargetWidthInputChange={setTargetWidthInput}
      />
    </main>
  );
}

const PATTERN_CANVAS_MONO_FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, monospace";
/** Bead code `fillText` size is this fraction of `cellSize` (zoom halves cell → halves font the same way). */
const PATTERN_CANVAS_BEAD_CODE_FONT_CELL_FRACTION = 0.42;
/** Row/column numbers use a smaller fraction of the same `cellSize` so they stay subordinate to codes. */
const PATTERN_CANVAS_AXIS_LABEL_FONT_CELL_FRACTION = 0.32;
/** Below this cell size, bead codes are omitted on the canvas (axis numbers still draw). */
const PATTERN_CANVAS_HIDE_BEAD_CODES_WHEN_CELL_BELOW_PX = 10;

/** Thick guide lines on the bead grid every this many cells (plus the outer right/bottom edge). */
const PATTERN_CANVAS_MAJOR_GRID_STEP = 5;

function drawPatternCanvas(
  canvas: HTMLCanvasElement,
  pattern: PatternDocument,
  paletteByCode: Map<string, { hex: string }>,
  layout: CanvasLayout,
  lineStartPoint: PatternPoint | null,
  linePreviewPoint: PatternPoint | null
): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fffaf2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e7ded1";
  context.fillRect(0, 0, canvas.width, layout.headerSize);
  context.fillRect(0, canvas.height - layout.headerSize, canvas.width, layout.headerSize);
  context.fillRect(0, 0, layout.headerSize, canvas.height);
  context.fillRect(canvas.width - layout.headerSize, 0, layout.headerSize, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  const axisLabelFontPx = Math.round(layout.cellSize * PATTERN_CANVAS_AXIS_LABEL_FONT_CELL_FRACTION);
  context.font = `600 ${axisLabelFontPx}px ${PATTERN_CANVAS_MONO_FONT_FAMILY}`;

  for (let column = 0; column < pattern.width; column += 1) {
    const x = layout.headerSize + column * layout.cellSize + layout.cellSize / 2;
    context.fillStyle = "#6b5b4b";
    context.fillText(String(column + 1), x, layout.headerSize / 2);
    context.fillText(String(column + 1), x, canvas.height - layout.headerSize / 2);
  }

  for (let row = 0; row < pattern.height; row += 1) {
    const y = layout.headerSize + row * layout.cellSize + layout.cellSize / 2;
    context.fillStyle = "#6b5b4b";
    context.fillText(String(row + 1), layout.headerSize / 2, y);
    context.fillText(String(row + 1), canvas.width - layout.headerSize / 2, y);
  }

  for (let row = 0; row < pattern.height; row += 1) {
    for (let column = 0; column < pattern.width; column += 1) {
      const index = row * pattern.width + column;
      const code = pattern.cells[index];
      const x = layout.headerSize + column * layout.cellSize;
      const y = layout.headerSize + row * layout.cellSize;
      context.fillStyle = code === null ? "#ffffff" : paletteByCode.get(code)?.hex ?? "#ffffff";
      context.fillRect(x, y, layout.cellSize, layout.cellSize);
      context.strokeStyle = "#d9d0c5";
      context.lineWidth = 1;
      context.strokeRect(x, y, layout.cellSize, layout.cellSize);
    }
  }

  if (layout.cellSize >= PATTERN_CANVAS_HIDE_BEAD_CODES_WHEN_CELL_BELOW_PX) {
    const beadCodeFontPx = Math.round(layout.cellSize * PATTERN_CANVAS_BEAD_CODE_FONT_CELL_FRACTION);
    context.font = `700 ${beadCodeFontPx}px ${PATTERN_CANVAS_MONO_FONT_FAMILY}`;
    for (let row = 0; row < pattern.height; row += 1) {
      for (let column = 0; column < pattern.width; column += 1) {
        const index = row * pattern.width + column;
        const code = pattern.cells[index];
        if (code === null) {
          continue;
        }
        const x = layout.headerSize + column * layout.cellSize;
        const y = layout.headerSize + row * layout.cellSize;
        const backgroundHex = paletteByCode.get(code)?.hex ?? "#ffffff";
        const centerX = x + layout.cellSize / 2;
        const centerY = y + layout.cellSize / 2;
        context.fillStyle = readableTextHexOnBackgroundHex(backgroundHex);
        context.fillText(code, centerX, centerY);
      }
    }
  }

  drawOuterMajorLines(context, pattern, layout);

  if (lineStartPoint !== null && linePreviewPoint !== null) {
    context.strokeStyle = "#111827";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(pointCenter(lineStartPoint, layout).x, pointCenter(lineStartPoint, layout).y);
    context.lineTo(pointCenter(linePreviewPoint, layout).x, pointCenter(linePreviewPoint, layout).y);
    context.stroke();
  }
}

function drawOuterMajorLines(context: CanvasRenderingContext2D, pattern: PatternDocument, layout: CanvasLayout): void {
  context.strokeStyle = "#b85b52";
  context.lineWidth = 2;

  function strokeVerticalLine(atColumnIndex: number): void {
    const x = layout.headerSize + atColumnIndex * layout.cellSize;
    context.beginPath();
    context.moveTo(x, layout.headerSize);
    context.lineTo(x, layout.headerSize + pattern.height * layout.cellSize);
    context.stroke();
  }

  function strokeHorizontalLine(atRowIndex: number): void {
    const y = layout.headerSize + atRowIndex * layout.cellSize;
    context.beginPath();
    context.moveTo(layout.headerSize, y);
    context.lineTo(layout.headerSize + pattern.width * layout.cellSize, y);
    context.stroke();
  }

  for (const column of majorGridLineCellIndices(pattern.width, PATTERN_CANVAS_MAJOR_GRID_STEP)) {
    strokeVerticalLine(column);
  }

  for (const row of majorGridLineCellIndices(pattern.height, PATTERN_CANVAS_MAJOR_GRID_STEP)) {
    strokeHorizontalLine(row);
  }
}

function pointCenter(point: PatternPoint, layout: CanvasLayout): { x: number; y: number } {
  return {
    x: layout.headerSize + point.column * layout.cellSize + layout.cellSize / 2,
    y: layout.headerSize + point.row * layout.cellSize + layout.cellSize / 2
  };
}

function canvasPointToPatternPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number, pattern: PatternDocument, layout: CanvasLayout): PatternPoint | null {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((clientX - rect.left - layout.headerSize) / layout.cellSize);
  const row = Math.floor((clientY - rect.top - layout.headerSize) / layout.cellSize);
  if (column < 0 || row < 0 || column >= pattern.width || row >= pattern.height) {
    return null;
  }
  return { column, row };
}

async function readImageFile(file: File): Promise<{ rgbBytes: ArrayBuffer; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas is not available for image conversion.");
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const rgba = imageData.data;
  const rgbByteLength = Math.floor(rgba.length / 4) * 3;
  const rgbBytes = new ArrayBuffer(rgbByteLength);
  const rgbView = new Uint8Array(rgbBytes);
  let writeIndex = 0;
  for (let index = 0; index < rgba.length; index += 4) {
    rgbView[writeIndex] = rgba[index];
    rgbView[writeIndex + 1] = rgba[index + 1];
    rgbView[writeIndex + 2] = rgba[index + 2];
    writeIndex += 3;
  }
  return { rgbBytes, width: canvas.width, height: canvas.height };
}

function getTargetDimensions(selectedSourceImage: SelectedSourceImage, resizeMode: ResizeMode, targetWidthInput: string, targetHeightInput: string, scalePercentInput: string): { width?: number; height?: number } | null {
  if (resizeMode === "original") {
    if (selectedSourceImage.width > maxPatternDimension || selectedSourceImage.height > maxPatternDimension) {
      return null;
    }
    return {};
  }

  if (resizeMode === "scale") {
    const scalePercent = Number(scalePercentInput);
    if (!Number.isFinite(scalePercent) || scalePercent <= 0 || scalePercent > 100) {
      return null;
    }
    const width = Math.max(1, Math.round((selectedSourceImage.width * scalePercent) / 100));
    const height = Math.max(1, Math.round((selectedSourceImage.height * scalePercent) / 100));
    if (width > maxPatternDimension || height > maxPatternDimension) {
      return null;
    }
    return { width, height };
  }

  const width = Number(targetWidthInput);
  const height = Number(targetHeightInput);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > maxPatternDimension || height > maxPatternDimension) {
    return null;
  }
  return { width, height };
}

function suggestTargetSize(width: number, height: number): { width: number; height: number; scalePercent: number } {
  const scale = Math.min(1, maxPatternDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scalePercent: Math.max(1, Math.floor(scale * 100))
  };
}

function createCanvasLayout(pattern: PatternDocument, zoom: number): CanvasLayout {
  const cellSize = Math.max(12, Math.round(baseCellSize * zoom));
  const headerSize = Math.max(24, Math.round(baseHeaderSize * zoom));
  return {
    cellSize,
    headerSize,
    width: pattern.width * cellSize + headerSize * 2,
    height: pattern.height * cellSize + headerSize * 2
  };
}

function getCanvasCursorClassName(activeTool: EditorTool): string {
  return activeTool === "hand" ? "cursor-grab" : "cursor-crosshair";
}

function getToolIcon(tool: EditorTool): LucideIcon {
  if (tool === "paintBucket") {
    return PaintBucket;
  }
  if (tool === "eyedropper") {
    return Pipette;
  }
  if (tool === "hand") {
    return Hand;
  }
  if (tool === "line") {
    return Minus;
  }
  return Pencil;
}

function clampZoom(value: number): number {
  return Math.min(3, Math.max(0.5, Math.round(value * 10) / 10));
}

function clonePattern(pattern: PatternDocument): PatternDocument {
  return {
    version: pattern.version,
    width: pattern.width,
    height: pattern.height,
    paletteBrand: pattern.paletteBrand,
    cells: [...pattern.cells],
    settings: { ...pattern.settings },
    legend: pattern.legend === undefined ? undefined : pattern.legend.map((item) => ({ ...item }))
  };
}

function createHistoryId(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isMatchingSpace(value: string): value is MatchingSpace {
  return value === "rgb" || value === "lab" || value === "hsl";
}

function isClusteringSpace(value: string): value is ClusteringSpace {
  return value === "rgb" || value === "lab";
}

function isDownsamplingMode(value: string): value is DownsamplingMode {
  return value === "nearest" || value === "gridMode";
}
