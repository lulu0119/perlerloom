"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  Blocks,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageDown,
  ImagePlus,
  Layers,
  LibraryBig,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useTranslation } from "react-i18next";
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
import {
  cn,
  Drawer,
  DrawerContent,
  DrawerTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@perlerloom/ui";
import { type AppStatusMessage } from "./app-status-message";
import { EditorSidePanels } from "./editor-side-panels";
import { ChartToolHud } from "./chart-tool-hud";
import {
  canvasPointToPatternPoint,
  CHART_ZOOM_STEPS,
  clampZoom,
  clonePattern,
  createCanvasLayout,
  createHistoryEntryId,
  drawPatternCanvas,
  getCanvasCursorClassName,
  getToolIcon,
  maxHistoryEntries,
  snapZoomToChartStep,
  stepChartZoom,
  type EditorTool,
  type HistoryEntry,
  type HistoryLabelKey
} from "./pattern-editor-utils";

const editorTools: EditorTool[] = ["pencil", "eraser", "eyedropper", "paintBucket", "hand", "line"];

export type PatternEditorWorkspaceProps = {
  pattern: PatternDocument;
  onPatternChange: (next: PatternDocument | ((previous: PatternDocument) => PatternDocument)) => void;
  /** When omitted, the workspace seeds history from the current pattern only. */
  initialHistoryEntries?: HistoryEntry[];
  initialActiveHistoryIndex?: number;
  onHistoryStateChange?: (entries: HistoryEntry[], activeHistoryIndex: number) => void;
  onOpenImportDialog: () => void;
  onOpenCreateNewPatternDialog: () => void;
  onOpenLibrary: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onAppStatus: (message: AppStatusMessage) => void;
};

export function PatternEditorWorkspace({
  pattern,
  onPatternChange,
  initialHistoryEntries,
  initialActiveHistoryIndex,
  onHistoryStateChange,
  onOpenImportDialog,
  onOpenCreateNewPatternDialog,
  onOpenLibrary,
  onExportPng,
  onExportJson,
  onAppStatus
}: PatternEditorWorkspaceProps): ReactElement {
  const { t } = useTranslation();
  const [activeTool, setActiveTool] = useState<EditorTool>("pencil");
  const [activeColor, setActiveColor] = useState("H7");
  const [zoom, setZoom] = useState(1);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() =>
    initialHistoryEntries !== undefined
      ? initialHistoryEntries.map((entry) => ({
          ...entry,
          pattern: clonePattern(entry.pattern)
        }))
      : [{ id: createHistoryEntryId(), labelKey: "history.generatedPattern", pattern: clonePattern(pattern) }]
  );
  const historyEntriesRef = useRef(historyEntries);
  historyEntriesRef.current = historyEntries;
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(initialActiveHistoryIndex ?? 0);
  const activeHistoryIndexRef = useRef(activeHistoryIndex);

  useEffect(() => {
    activeHistoryIndexRef.current = activeHistoryIndex;
  }, [activeHistoryIndex]);
  const [lineStartPoint, setLineStartPoint] = useState<PatternPoint | null>(null);
  const [linePreviewPoint, setLinePreviewPoint] = useState<PatternPoint | null>(null);
  const [eyedropperHoverCell, setEyedropperHoverCell] = useState<PatternPoint | null>(null);
  const [mobileSidePanelOpen, setMobileSidePanelOpen] = useState(false);
  const [mobileToolRailPage, setMobileToolRailPage] = useState<0 | 1>(0);
  const [isNarrowToolRail, setIsNarrowToolRail] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const handPanRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const chartDragStrokeActiveRef = useRef(false);
  const chartDragStrokeToolRef = useRef<"pencil" | "eraser" | null>(null);
  const chartDragStrokeLastCellRef = useRef<PatternPoint | null>(null);
  const chartDragStrokeLatestRef = useRef<PatternDocument | null>(null);

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
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQueryList = window.matchMedia("(max-width: 767px)");
    function syncMobileLayout(): void {
      const narrow = mediaQueryList.matches;
      setIsNarrowToolRail(narrow);
      if (!narrow) {
        setMobileSidePanelOpen(false);
        setMobileToolRailPage(0);
      }
    }
    syncMobileLayout();
    mediaQueryList.addEventListener("change", syncMobileLayout);
    return () => mediaQueryList.removeEventListener("change", syncMobileLayout);
  }, []);

  function selectActiveTool(nextTool: EditorTool): void {
    setActiveTool(nextTool);
    if (nextTool !== "eyedropper") {
      setEyedropperHoverCell(null);
    }
  }

  function toolLabel(tool: EditorTool): string {
    return t(`workspace.tools.${tool}`);
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
        onAppStatus({ tone: "accent", key: "status.emptyCellEyedropper" });
        return;
      }
      setActiveColor(code);
      return;
    }

    if (activeTool === "paintBucket") {
      applyPatternEdit("history.bucketFill", bucketFillPattern(pattern, point, activeColor));
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

    if (activeTool === "pencil" || activeTool === "eraser") {
      if (event.button !== 0) {
        return;
      }
      const point = canvasPointToPatternPoint(event.currentTarget, event.clientX, event.clientY, pattern, canvasLayout);
      if (point === null) {
        return;
      }
      const strokeTool = activeTool;
      chartDragStrokeActiveRef.current = true;
      chartDragStrokeToolRef.current = strokeTool;
      chartDragStrokeLastCellRef.current = point;
      event.currentTarget.setPointerCapture(event.pointerId);
      const targetCode = strokeTool === "eraser" ? null : activeColor;
      onPatternChange((currentPattern) => {
        const next = drawPatternLine(currentPattern, point, point, targetCode);
        chartDragStrokeLatestRef.current = next;
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

    const strokeTool = chartDragStrokeToolRef.current;
    if (
      chartDragStrokeActiveRef.current &&
      (strokeTool === "pencil" || strokeTool === "eraser")
    ) {
      const canvas = event.currentTarget;
      const clientX = event.clientX;
      const clientY = event.clientY;
      const targetCode = strokeTool === "eraser" ? null : activeColor;
      onPatternChange((currentPattern) => {
        const current = canvasPointToPatternPoint(canvas, clientX, clientY, currentPattern, canvasLayout);
        const last = chartDragStrokeLastCellRef.current;
        if (current === null || last === null) {
          return currentPattern;
        }
        if (current.column === last.column && current.row === last.row) {
          return currentPattern;
        }
        const next = drawPatternLine(currentPattern, last, current, targetCode);
        chartDragStrokeLastCellRef.current = current;
        chartDragStrokeLatestRef.current = next;
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

  function finishChartDragStrokeIfActive(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!chartDragStrokeActiveRef.current) {
      return;
    }
    chartDragStrokeActiveRef.current = false;
    chartDragStrokeLastCellRef.current = null;
    const strokeTool = chartDragStrokeToolRef.current;
    chartDragStrokeToolRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer capture may already be released */
    }
    const snapshot = chartDragStrokeLatestRef.current;
    chartDragStrokeLatestRef.current = null;
    if (snapshot !== null) {
      const labelKey: HistoryLabelKey =
        strokeTool === "eraser" ? "history.eraserStroke" : "history.pencilStroke";
      appendHistory(labelKey, clonePattern(snapshot));
    }
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLCanvasElement>): void {
    finishChartDragStrokeIfActive(event);

    if (activeTool === "hand") {
      handPanRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "line" && lineStartPoint !== null && linePreviewPoint !== null) {
      applyPatternEdit("history.line", drawPatternLine(pattern, lineStartPoint, linePreviewPoint, activeColor));
    }
    setLineStartPoint(null);
    setLinePreviewPoint(null);
  }

  function handleUndo(): void {
    if (activeHistoryIndex === 0) {
      onAppStatus({ tone: "muted", key: "status.noUndo" });
      return;
    }
    jumpToHistory(activeHistoryIndex - 1);
  }

  function handleRedo(): void {
    if (activeHistoryIndex >= historyEntries.length - 1) {
      onAppStatus({ tone: "muted", key: "status.noRedo" });
      return;
    }
    jumpToHistory(activeHistoryIndex + 1);
  }

  function applyPatternEdit(labelKey: HistoryLabelKey, editedPattern: PatternDocument): void {
    const nextPattern = clonePattern(editedPattern);
    onPatternChange(nextPattern);
    appendHistory(labelKey, nextPattern);
  }

  function appendHistory(labelKey: HistoryLabelKey, nextPattern: PatternDocument): void {
    const activeEntries = historyEntriesRef.current.slice(0, activeHistoryIndexRef.current + 1);
    const nextEntries = [...activeEntries, { id: createHistoryEntryId(), labelKey, pattern: clonePattern(nextPattern) }].slice(-maxHistoryEntries);
    const nextIndex = nextEntries.length - 1;
    historyEntriesRef.current = nextEntries;
    setHistoryEntries(nextEntries);
    setActiveHistoryIndex(nextIndex);
    queueMicrotask(() => {
      onHistoryStateChange?.(nextEntries, nextIndex);
    });
  }

  function jumpToHistory(index: number): void {
    const entry = historyEntries[index];
    if (entry === undefined) {
      return;
    }
    onPatternChange(clonePattern(entry.pattern));
    setActiveHistoryIndex(index);
    onHistoryStateChange?.(historyEntries, index);
    onAppStatus({
      tone: "muted",
      key: "status.restored",
      params: { label: t(entry.labelKey) }
    });
  }

  const toolRailButtonClassName =
    "text-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
  const canvasCursorClassName = getCanvasCursorClassName(activeTool);

  const drawingToolButtons = editorTools.map((tool) => {
    const Icon = getToolIcon(tool);
    const label = toolLabel(tool);
    return (
      <Tooltip key={tool}>
        <TooltipTrigger
          aria-current={activeTool === tool ? "true" : undefined}
          aria-label={label}
          className={cn(
            toolRailButtonClassName,
            activeTool === tool
              ? "border-primary bg-accent text-accent-foreground"
              : "border-border bg-white hover:bg-muted md:hover:bg-muted"
          )}
          type="button"
          onClick={() => selectActiveTool(tool)}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  });

  const fileActionButtons = useMemo(
    () => [
      <Tooltip key="new-import">
        <TooltipTrigger
          aria-label={t("workspace.newImportTooltip")}
          className={cn(
            toolRailButtonClassName,
            "border-primary/35 bg-accent text-accent-foreground hover:bg-accent/80"
          )}
          type="button"
          onClick={onOpenImportDialog}
        >
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {t("workspace.newImportTooltip")}
        </TooltipContent>
      </Tooltip>,
      <Tooltip key="new-pattern">
        <TooltipTrigger
          aria-label={t("workspace.createNewPatternTooltip")}
          className={cn(toolRailButtonClassName, "border-border bg-white text-foreground hover:bg-muted")}
          type="button"
          onClick={onOpenCreateNewPatternDialog}
        >
          <Blocks className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {t("workspace.createNewPatternTooltip")}
        </TooltipContent>
      </Tooltip>,
      <Tooltip key="library">
        <TooltipTrigger
          aria-label={t("workspace.patternLibraryTooltip")}
          className={cn(toolRailButtonClassName, "border-border bg-white text-foreground hover:bg-muted")}
          type="button"
          onClick={onOpenLibrary}
        >
          <LibraryBig className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {t("workspace.patternLibraryTooltip")}
        </TooltipContent>
      </Tooltip>,
      <Tooltip key="export-png">
        <TooltipTrigger
          aria-label={t("workspace.exportImageTooltip")}
          className={cn(toolRailButtonClassName, "border-border bg-white text-foreground hover:bg-muted")}
          type="button"
          onClick={onExportPng}
        >
          <ImageDown className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {t("workspace.exportImageTooltip")}
        </TooltipContent>
      </Tooltip>,
      <Tooltip key="export-json">
        <TooltipTrigger
          aria-label={t("workspace.exportFileTooltip")}
          className={cn(toolRailButtonClassName, "border-border bg-white text-foreground hover:bg-muted")}
          type="button"
          onClick={onExportJson}
        >
          <Download className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {t("workspace.exportFileTooltip")}
        </TooltipContent>
      </Tooltip>
    ],
    [t, onOpenImportDialog, onOpenCreateNewPatternDialog, onOpenLibrary, onExportPng, onExportJson]
  );

  const sidePanelContent = (
    <EditorSidePanels
      activeColor={activeColor}
      activeHistoryIndex={activeHistoryIndex}
      historyEntries={historyEntries}
      legend={legend}
      paletteByCode={paletteByCode}
      onActiveColorChange={setActiveColor}
      onApplyDelete={(fromCode) => applyPatternEdit("history.delete", deletePatternColor(pattern, fromCode))}
      onApplyReplace={(fromCode) => applyPatternEdit("history.replace", replacePatternColor(pattern, fromCode, activeColor))}
      onJumpToHistory={jumpToHistory}
      onRedo={handleRedo}
      onUndo={handleUndo}
    />
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside
        aria-label={t("workspace.editorToolsAside")}
        className="border-border flex shrink-0 flex-col border-b bg-white/95 p-2 md:w-16 md:border-b-0 md:border-r"
      >
        {isNarrowToolRail ? (
        <div className="flex w-full min-w-0 flex-row items-center gap-1">
          <button
            aria-label={t("workspace.toolRailPreviousPage")}
            className="border-border text-muted-foreground flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border bg-white transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"
            disabled={mobileToolRailPage === 0}
            type="button"
            onClick={() => setMobileToolRailPage(0)}
          >
            <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
          <div
            aria-label={t("workspace.toolRailPagerLabel", { page: mobileToolRailPage + 1 })}
            className="min-w-0 flex-1 overflow-hidden"
            role="group"
          >
            <div
              className={cn(
                "flex w-[200%] shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0",
                mobileToolRailPage === 0 ? "translate-x-0" : "-translate-x-1/2"
              )}
            >
              <div className="flex w-1/2 shrink-0 items-center justify-center gap-1">{drawingToolButtons}</div>
              <div className="flex w-1/2 shrink-0 items-center justify-center gap-1">{fileActionButtons}</div>
            </div>
          </div>
          <button
            aria-label={t("workspace.toolRailNextPage")}
            className="border-border text-muted-foreground flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border bg-white transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"
            disabled={mobileToolRailPage === 1}
            type="button"
            onClick={() => setMobileToolRailPage(1)}
          >
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        </div>
        ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-col items-center gap-1 overflow-y-auto overflow-x-visible">
          {drawingToolButtons}
          <div
            className="bg-border mx-1 h-11 w-px shrink-0 md:mx-auto md:my-1 md:h-px md:w-8 md:self-center"
            role="presentation"
          />
          {fileActionButtons}
        </div>
        )}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="bg-brand-surface-muted md:bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="border-border flex shrink-0 flex-col border-b bg-white/90 p-2">
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
                className="border-border text-foreground inline-flex h-10 shrink-0 items-center gap-0 overflow-hidden rounded-full border bg-white p-1 text-xs font-medium md:h-8 md:gap-0.5 md:px-1 md:py-0"
                role="group"
                aria-label={t("workspace.magnificationControls")}
              >
                <Tooltip>
                  <TooltipTrigger
                    aria-label={t("workspace.zoomOut")}
                    className="text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full p-0 transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 md:h-auto md:min-h-0 md:w-auto md:min-w-0 md:rounded-full md:p-1"
                    disabled={snapZoomToChartStep(zoom) <= CHART_ZOOM_STEPS[0]!}
                    type="button"
                    onClick={() => setZoom((current) => stepChartZoom(current, -1))}
                  >
                    <ZoomOut className="h-5 w-5 shrink-0 md:h-3.5 md:w-3.5" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t("workspace.zoomOutTooltip")}</TooltipContent>
                </Tooltip>
                <select
                  aria-label={t("workspace.chartZoom")}
                  className="h-8 max-h-8 min-h-0 max-w-[4.5rem] shrink-0 cursor-pointer appearance-none border-0 bg-transparent px-0.5 py-0 text-center text-xs font-semibold leading-none outline-none md:h-full md:max-h-none md:px-0.5"
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
                <Tooltip>
                  <TooltipTrigger
                    aria-label={t("workspace.zoomIn")}
                    className="text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full p-0 transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 md:h-auto md:min-h-0 md:w-auto md:min-w-0 md:rounded-full md:p-1"
                    disabled={snapZoomToChartStep(zoom) >= CHART_ZOOM_STEPS[CHART_ZOOM_STEPS.length - 1]!}
                    type="button"
                    onClick={() => setZoom((current) => stepChartZoom(current, 1))}
                  >
                    <ZoomIn className="h-5 w-5 shrink-0 md:h-3.5 md:w-3.5" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t("workspace.zoomInTooltip")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div
            ref={chartScrollRef}
            className="min-h-0 flex-1 overflow-auto overscroll-y-contain p-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:p-3"
          >
            <canvas
              aria-label={t("workspace.editableBeadPattern")}
              className={cn(
                "block max-md:touch-none rounded-lg bg-white shadow-sm",
                canvasCursorClassName
              )}
              height={canvasLayout.height}
              ref={canvasRef}
              width={canvasLayout.width}
              onClick={handleCanvasClick}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerLeave={() => {
                setEyedropperHoverCell(null);
              }}
              onPointerCancel={finishChartDragStrokeIfActive}
              onPointerUp={handleCanvasPointerUp}
              onLostPointerCapture={finishChartDragStrokeIfActive}
            />
          </div>
        </div>
      </div>

      <aside
        className="border-border hidden min-h-0 w-[300px] shrink-0 flex-col overflow-y-auto overscroll-contain border-l bg-white/95 p-2 md:flex"
        aria-label={t("workspace.paletteAndHistoryAside")}
      >
        {sidePanelContent}
      </aside>

      <Tooltip>
        <TooltipTrigger
          aria-expanded={mobileSidePanelOpen}
          aria-haspopup="dialog"
          aria-label={t("workspace.openPaletteAndHistory")}
          className="border-primary/35 bg-accent text-accent-foreground fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-30 flex h-12 w-12 items-center justify-center rounded-full border shadow-lg md:hidden"
          type="button"
          onClick={() => setMobileSidePanelOpen(true)}
        >
          <Layers className="h-6 w-6" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="left">{t("workspace.openPaletteAndHistoryTooltip")}</TooltipContent>
      </Tooltip>

      <Drawer open={mobileSidePanelOpen} onOpenChange={setMobileSidePanelOpen} repositionInputs={false}>
        <DrawerContent className="gap-0 p-0 md:hidden">
          <DrawerTitle className="sr-only">{t("workspace.paletteAndHistoryDialog")}</DrawerTitle>
          <div className="flex min-h-0 max-h-[min(78dvh,calc(100dvh-4rem))] flex-1 flex-col overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
            {sidePanelContent}
          </div>
        </DrawerContent>
      </Drawer>

      </div>
    </TooltipProvider>
  );
}
