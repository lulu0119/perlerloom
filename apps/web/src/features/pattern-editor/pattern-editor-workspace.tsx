"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { ImagePlus, LayoutGrid, Layers, ZoomIn, ZoomOut } from "lucide-react";
import {
  bucketFillPattern,
  buildLegend,
  deletePatternColor,
  drawPatternLine,
  replacePatternColor,
  type PatternDocument,
  type PatternPoint
} from "@perlerloom/core";
import { mardPalette } from "@perlerloom/palettes";
import { cn } from "@perlerloom/ui";
import { EditorSidePanels } from "./editor-side-panels";
import { ChartToolHud } from "./chart-tool-hud";
import {
  canvasPointToPatternPoint,
  CHART_ZOOM_STEPS,
  clampZoom,
  clonePattern,
  createCanvasLayout,
  createHistoryId,
  drawPatternCanvas,
  getCanvasCursorClassName,
  getToolIcon,
  maxHistoryEntries,
  snapZoomToChartStep,
  stepChartZoom,
  type EditorTool,
  type HistoryEntry
} from "./pattern-editor-utils";

const toolLabels: Record<EditorTool, string> = {
  pencil: "Pencil",
  eyedropper: "Eyedropper",
  paintBucket: "Paint Bucket",
  hand: "Hand",
  line: "Line"
};

export type PatternEditorWorkspaceProps = {
  pattern: PatternDocument;
  onPatternChange: (next: PatternDocument | ((previous: PatternDocument) => PatternDocument)) => void;
  onOpenImportDialog: () => void;
  onOpenCreateNewPatternDialog: () => void;
  statusMessage: string;
  onStatusMessageChange: (message: string) => void;
};

export function PatternEditorWorkspace({
  pattern,
  onPatternChange,
  onOpenImportDialog,
  onOpenCreateNewPatternDialog,
  statusMessage,
  onStatusMessageChange
}: PatternEditorWorkspaceProps): ReactElement {
  const [activeTool, setActiveTool] = useState<EditorTool>("pencil");
  const [activeColor, setActiveColor] = useState("H7");
  const [zoom, setZoom] = useState(1);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => [
    { id: createHistoryId("Generated pattern"), label: "Generated pattern", pattern: clonePattern(pattern) }
  ]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);
  const [lineStartPoint, setLineStartPoint] = useState<PatternPoint | null>(null);
  const [linePreviewPoint, setLinePreviewPoint] = useState<PatternPoint | null>(null);
  const [eyedropperHoverCell, setEyedropperHoverCell] = useState<PatternPoint | null>(null);
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

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>): void {
    const point = canvasPointToPatternPoint(event.currentTarget, event.clientX, event.clientY, pattern, canvasLayout);
    if (point === null) {
      return;
    }

    if (activeTool === "eyedropper") {
      const index = point.row * pattern.width + point.column;
      const code = pattern.cells[index];
      if (code === null) {
        onStatusMessageChange("That cell is empty—no bead color to pick.");
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
      onPatternChange((currentPattern) => {
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
      const clientX = event.clientX;
      const clientY = event.clientY;
      onPatternChange((currentPattern) => {
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

  function handleUndo(): void {
    if (activeHistoryIndex === 0) {
      onStatusMessageChange("No edits to undo.");
      return;
    }
    jumpToHistory(activeHistoryIndex - 1);
  }

  function handleRedo(): void {
    if (activeHistoryIndex >= historyEntries.length - 1) {
      onStatusMessageChange("No edits to redo.");
      return;
    }
    jumpToHistory(activeHistoryIndex + 1);
  }

  function applyPatternEdit(label: string, editedPattern: PatternDocument): void {
    const nextPattern = clonePattern(editedPattern);
    onPatternChange(nextPattern);
    appendHistory(label, nextPattern);
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
    onPatternChange(clonePattern(entry.pattern));
    setActiveHistoryIndex(index);
    onStatusMessageChange(`Restored: ${entry.label}.`);
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
          onClick={onOpenImportDialog}
        >
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          aria-label="Create new pattern"
          className={cn(toolRailButtonClassName, "border-stone-200 bg-white text-stone-800 hover:bg-stone-50")}
          title="Create new pattern"
          type="button"
          onClick={onOpenCreateNewPatternDialog}
        >
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
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
              <div
                className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-stone-300 bg-white px-1 text-xs font-medium text-stone-700"
                role="group"
                aria-label="Magnification controls"
              >
                <button
                  aria-label="Zoom out"
                  className="inline-flex shrink-0 items-center justify-center rounded-full p-1 text-stone-600 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={snapZoomToChartStep(zoom) <= CHART_ZOOM_STEPS[0]!}
                  type="button"
                  onClick={() => setZoom((current) => stepChartZoom(current, -1))}
                >
                  <ZoomOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
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
                <button
                  aria-label="Zoom in"
                  className="inline-flex shrink-0 items-center justify-center rounded-full p-1 text-stone-600 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={snapZoomToChartStep(zoom) >= CHART_ZOOM_STEPS[CHART_ZOOM_STEPS.length - 1]!}
                  type="button"
                  onClick={() => setZoom((current) => stepChartZoom(current, 1))}
                >
                  <ZoomIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <p className="line-clamp-2 border-b border-stone-200/80 bg-stone-100/90 px-2 py-1 text-xs text-stone-700 md:text-sm" role="status">
            {statusMessage}
          </p>

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
    </div>
  );
}
