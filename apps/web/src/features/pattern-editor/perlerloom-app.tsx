"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Hand,
  ImageIcon,
  Minus,
  PaintBucket,
  Pencil,
  Redo2,
  Save,
  Share2,
  Sparkles,
  Square,
  Undo2,
  UploadCloud,
  ZoomIn,
  ZoomOut,
  type LucideIcon
} from "lucide-react";
import {
  bucketFillPattern,
  buildLegend,
  deletePatternColor,
  drawPatternLine,
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
import { createExportMetadata } from "@/lib/pattern-storage";

type EditorTool = "pencil" | "paintBucket" | "hand" | "rectangle" | "line";
type ResizeMode = "original" | "dimensions" | "scale";

type SelectedSourceImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

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
  paintBucket: "Paint Bucket",
  hand: "Hand",
  rectangle: "Rectangle Select",
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthenticated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const handPanRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const paletteByCode = useMemo(() => new Map(mardPalette.map((color) => [color.code, color])), []);
  const legend = pattern.legend ?? buildLegend(pattern.cells);
  const canvasLayout = useMemo(() => createCanvasLayout(pattern, zoom), [pattern, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    drawPatternCanvas(canvas, pattern, paletteByCode, activeColor, canvasLayout, lineStartPoint, linePreviewPoint);
  }, [activeColor, canvasLayout, linePreviewPoint, lineStartPoint, paletteByCode, pattern]);

  useEffect(() => {
    return () => {
      if (selectedSourceImage !== null) {
        URL.revokeObjectURL(selectedSourceImage.previewUrl);
      }
    };
  }, [selectedSourceImage]);

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

    if (activeTool === "paintBucket") {
      applyPatternEdit("Bucket fill", bucketFillPattern(pattern, point, activeColor));
      return;
    }

    if (activeTool === "pencil") {
      applyPatternEdit("Pencil", drawPatternLine(pattern, point, point, activeColor));
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
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLCanvasElement>): void {
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

  const toolButtonClassName = "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition";
  const canvasCursorClassName = getCanvasCursorClassName(activeTool);

  return (
    <main className="min-h-screen bg-[#f8efe3] text-stone-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6">
        <header className="flex flex-col gap-3 rounded-[2rem] border border-amber-200 bg-white/85 p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Perlerloom</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Chart-first bead pattern studio</h1>
            <p className="mt-2 max-w-3xl text-stone-600">
              Preview an image, choose an explicit size, generate a crisp bead chart, then edit it like a craft worksheet.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Local conversion is free. AI pixel-art cleanup is visible below, but requires sign-in and is not active in this MVP.
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-[2rem] border border-amber-200 bg-white/90 p-4 shadow-sm">
            <section aria-label="Upload and preview" className="space-y-3">
              <label
                className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-amber-300 bg-amber-50/70 p-5 text-center transition hover:border-amber-500 hover:bg-amber-100/70"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <UploadCloud className="h-9 w-9 text-amber-700" aria-hidden="true" />
                <span className="mt-3 text-base font-semibold">Drop image here or click to upload</span>
                <span className="mt-1 text-sm text-stone-600">PNG, JPEG, or another browser-supported image</span>
                <input aria-label="Choose source image" className="sr-only" type="file" accept="image/*" onChange={handleFileInputChange} />
              </label>

              {selectedSourceImage !== null ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <div className="relative h-40 overflow-hidden rounded-xl bg-stone-100">
                    <Image alt="Selected source image" className="object-contain" fill sizes="320px" src={selectedSourceImage.previewUrl} unoptimized />
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-700">
                    Source: {selectedSourceImage.width} x {selectedSourceImage.height} px
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
                  <ImageIcon className="mb-2 h-5 w-5 text-stone-500" aria-hidden="true" />
                  Image preview appears here before generation.
                </div>
              )}
            </section>

            <section aria-label="Pattern size" className="space-y-3 rounded-2xl bg-stone-50 p-3">
              <div>
                <h2 className="text-base font-semibold">Pattern size</h2>
                <p className="text-xs text-stone-600">Images up to 256 x 256 keep their source size by default. Larger images need an explicit target.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(["original", "dimensions", "scale"] as ResizeMode[]).map((mode) => (
                  <label className="rounded-xl border border-stone-200 bg-white px-3 py-2" key={mode}>
                    <input className="mr-2" checked={resizeMode === mode} name="resize-mode" type="radio" onChange={() => setResizeMode(mode)} />
                    {mode === "original" ? "Original" : mode === "dimensions" ? "Width/height" : "Scale"}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Target width
                  <input aria-label="Target width" className="mt-1 w-full rounded-xl border border-stone-300 p-2" max={maxPatternDimension} min={1} type="number" value={targetWidthInput} onChange={(event) => setTargetWidthInput(event.currentTarget.value)} />
                </label>
                <label className="text-sm font-medium">
                  Target height
                  <input aria-label="Target height" className="mt-1 w-full rounded-xl border border-stone-300 p-2" max={maxPatternDimension} min={1} type="number" value={targetHeightInput} onChange={(event) => setTargetHeightInput(event.currentTarget.value)} />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Scale factor
                <input aria-label="Scale factor" className="mt-1 w-full rounded-xl border border-stone-300 p-2" max={100} min={1} type="number" value={scalePercentInput} onChange={(event) => setScalePercentInput(event.currentTarget.value)} />
              </label>
              <label className="block text-sm font-medium">
                Downsampling method
                <select
                  aria-label="Downsampling method"
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2"
                  value={settings.downsamplingMode}
                  onChange={(event) => {
                    const selectedValue = event.currentTarget.value;
                    updateDownsamplingMode(selectedValue);
                  }}
                >
                  <option value="nearest">Nearest neighbor</option>
                  <option value="gridMode">Grid mode</option>
                </select>
              </label>
            </section>

            <section aria-label="Preprocessing options" className="space-y-3 rounded-2xl bg-stone-50 p-3">
              <div>
                <h2 className="text-base font-semibold">Preprocessing</h2>
                <p className="text-xs text-stone-600">Free local conversion is active now. Dithering starts off for cleaner bead charts.</p>
              </div>
              <label className="block text-sm font-medium">
                Target colors
                <input aria-label="Target colors" className="mt-1 w-full rounded-xl border border-stone-300 p-2" min={1} max={mardPalette.length} type="number" value={settings.targetColorCount} onChange={(event) => updateTargetColorCount(event.currentTarget.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Match space
                  <select
                    aria-label="Match space"
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2"
                    value={settings.matchingSpace}
                    onChange={(event) => {
                      const selectedValue = event.currentTarget.value;
                      updateMatchingSpace(selectedValue);
                    }}
                  >
                    <option value="rgb">RGB</option>
                    <option value="lab">Lab</option>
                    <option value="hsl">HSL</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Cluster space
                  <select
                    aria-label="Cluster space"
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2"
                    value={settings.clusteringSpace}
                    onChange={(event) => {
                      const selectedValue = event.currentTarget.value;
                      updateClusteringSpace(selectedValue);
                    }}
                  >
                    <option value="rgb">RGB</option>
                    <option value="lab">Lab</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  aria-label="Enable dithering"
                  checked={settings.ditheringEnabled}
                  type="checkbox"
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    updateDitheringEnabled(checked);
                  }}
                />
                Enable dithering
              </label>
              <button className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-500" disabled type="button">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                AI pixel-art cleanup requires sign-in
              </button>
            </section>

            <button className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-300" disabled={selectedSourceImage === null || isGenerating} type="button" onClick={() => void handleGeneratePattern()}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isGenerating ? "Generating..." : "Generate pattern"}
            </button>
          </aside>

          <section className="min-w-0 rounded-[2rem] border border-amber-200 bg-white/95 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Generated chart preview</p>
                <p className="mt-1 text-sm text-stone-600">
                  Active tool: {toolLabels[activeTool]} · Active color: {activeColor}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(toolLabels) as EditorTool[]).map((tool) => {
                  const Icon = getToolIcon(tool);
                  return (
                    <button aria-label={toolLabels[tool]} className={cn(toolButtonClassName, activeTool === tool ? "border-amber-700 bg-amber-100 text-amber-950" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50")} key={tool} type="button" onClick={() => setActiveTool(tool)}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{toolLabels[tool]}</span>
                    </button>
                  );
                })}
                <button className={cn(toolButtonClassName, "border-stone-300 bg-white")} type="button" onClick={handleUndo}>
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                  Undo
                </button>
                <button className={cn(toolButtonClassName, "border-stone-300 bg-white")} type="button" onClick={handleRedo}>
                  <Redo2 className="h-4 w-4" aria-hidden="true" />
                  Redo
                </button>
                <label className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
                  <span className="sr-only">Chart zoom</span>
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                  <select
                    aria-label="Chart zoom"
                    className="bg-transparent text-sm font-semibold outline-none"
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
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </label>
              </div>
            </div>

            <div ref={chartScrollRef} className="max-h-[68vh] overflow-auto rounded-2xl border border-stone-300 bg-[#f1eadf] p-3">
              <canvas
                aria-label="Editable bead pattern"
                className={cn("block rounded-lg bg-white shadow-sm", canvasCursorClassName)}
                height={canvasLayout.height}
                ref={canvasRef}
                width={canvasLayout.width}
                onClick={handleCanvasClick}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
              />
            </div>

            <div aria-label="Legend badges" className="mt-3 flex flex-wrap gap-2">
              {legend.map((item) => {
                const color = paletteByCode.get(item.code);
                return (
                  <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-1 shadow-sm" key={item.code}>
                    <button aria-label={`Select ${item.code}, ${item.count} beads`} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", activeColor === item.code ? "border-stone-950 ring-2 ring-amber-300" : "border-stone-300")} style={{ backgroundColor: color?.hex ?? "#ffffff" }} type="button" onClick={() => setActiveColor(item.code)}>
                      {item.code} · {item.count}
                    </button>
                    <button className="rounded-full px-2 text-xs text-amber-700 hover:bg-amber-50" type="button" onClick={() => applyPatternEdit("Replace", replacePatternColor(pattern, item.code, activeColor))}>
                      Replace
                    </button>
                    <button className="rounded-full px-2 text-xs text-red-700 hover:bg-red-50" type="button" onClick={() => applyPatternEdit("Delete", deletePatternColor(pattern, item.code))}>
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_260px]">
              <p className="rounded-2xl bg-stone-100 px-3 py-2 text-sm text-stone-700">{message}</p>
              <section aria-label="History timeline" className="rounded-2xl border border-stone-200 bg-white p-3">
                <h2 className="mb-2 text-sm font-semibold">History</h2>
                <div className="flex max-h-40 flex-col gap-1 overflow-auto">
                  {historyEntries.map((entry, index) => (
                    <button aria-current={index === activeHistoryIndex ? "step" : undefined} className={cn("rounded-xl px-3 py-2 text-left text-sm transition", index === activeHistoryIndex ? "bg-amber-100 font-semibold text-amber-950" : "bg-stone-50 text-stone-700 hover:bg-stone-100")} key={entry.id} type="button" onClick={() => jumpToHistory(index)}>
                      {entry.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={handleSave}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save to cloud
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void handleCreateShare()}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Create share QR
              </button>
              {shareQrDataUrl !== null ? <Image alt="Perlerloom share QR code" className="rounded-xl border border-stone-200 p-2" height={96} src={shareQrDataUrl} unoptimized width={96} /> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function drawPatternCanvas(
  canvas: HTMLCanvasElement,
  pattern: PatternDocument,
  paletteByCode: Map<string, { hex: string }>,
  activeColor: string,
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
  context.font = `${Math.max(10, Math.round(layout.cellSize * 0.34))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";

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
      const isMajorLine = column % 5 === 4 || row % 5 === 4;
      context.fillStyle = code === null ? "#ffffff" : paletteByCode.get(code)?.hex ?? "#ffffff";
      context.fillRect(x, y, layout.cellSize, layout.cellSize);
      context.strokeStyle = isMajorLine ? "#b85b52" : "#d9d0c5";
      context.lineWidth = isMajorLine ? 2 : 1;
      context.strokeRect(x, y, layout.cellSize, layout.cellSize);

      if (code !== null) {
        const centerX = x + layout.cellSize / 2;
        const centerY = y + layout.cellSize / 2;
        context.lineWidth = Math.max(2, layout.cellSize * 0.08);
        context.strokeStyle = activeColor === code ? "#ffffff" : "rgba(0, 0, 0, 0.72)";
        context.strokeText(code, centerX, centerY);
        context.fillStyle = activeColor === code ? "#1c1917" : "#ffffff";
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
  for (let column = 0; column <= pattern.width; column += 5) {
    const x = layout.headerSize + column * layout.cellSize;
    context.beginPath();
    context.moveTo(x, layout.headerSize);
    context.lineTo(x, layout.headerSize + pattern.height * layout.cellSize);
    context.stroke();
  }
  for (let row = 0; row <= pattern.height; row += 5) {
    const y = layout.headerSize + row * layout.cellSize;
    context.beginPath();
    context.moveTo(layout.headerSize, y);
    context.lineTo(layout.headerSize + pattern.width * layout.cellSize, y);
    context.stroke();
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
  if (tool === "hand") {
    return Hand;
  }
  if (tool === "rectangle") {
    return Square;
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
