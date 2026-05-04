"use client";

import { ArrowLeftRight, Redo2, Trash2, Undo2 } from "lucide-react";
import { readableTextHexOnBackgroundHex, type PatternDocument, type PatternLegendItem } from "@perlerloom/core";
import { cn } from "@perlerloom/ui";
import {
  drawingColorChromeBorderColorWhenActiveClass,
  drawingColorChromeBorderColorWhenIdleClass,
  drawingColorChromeBorderWidthClass
} from "./active-drawing-color-chrome";
import { MardPaletteGrid } from "./mard-palette-grid";

type HistoryEntry = {
  id: string;
  label: string;
  pattern: PatternDocument;
};

type EditorSidePanelsProps = {
  activeColor: string;
  onActiveColorChange: (code: string) => void;
  legend: PatternLegendItem[];
  paletteByCode: Map<string, { hex: string }>;
  onApplyReplace: (fromCode: string) => void;
  onApplyDelete: (fromCode: string) => void;
  historyEntries: HistoryEntry[];
  activeHistoryIndex: number;
  onJumpToHistory: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
};

export function EditorSidePanels({
  activeColor,
  onActiveColorChange,
  legend,
  paletteByCode,
  onApplyReplace,
  onApplyDelete,
  historyEntries,
  activeHistoryIndex,
  onJumpToHistory,
  onUndo,
  onRedo,
  className
}: EditorSidePanelsProps): React.ReactElement {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden", className)}>
      <section aria-label="Legend badges" className="shrink-0 rounded-xl border border-stone-200 bg-stone-50/80 p-2">
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Used in chart</h2>
        <div className="flex flex-wrap gap-1.5">
          {legend.map((item) => {
            const color = paletteByCode.get(item.code);
            const isActiveChip = activeColor === item.code;
            const swatchHex = color?.hex ?? "#ffffff";
            const codeOnSwatchColor = readableTextHexOnBackgroundHex(swatchHex);
            return (
              <div
                className={cn(
                  "flex min-h-9 min-w-0 items-stretch overflow-hidden rounded-full bg-white shadow-sm transition",
                  drawingColorChromeBorderWidthClass,
                  isActiveChip ? drawingColorChromeBorderColorWhenActiveClass : drawingColorChromeBorderColorWhenIdleClass
                )}
                key={item.code}
              >
                <button
                  aria-label={`Select ${item.code}`}
                  aria-pressed={isActiveChip}
                  className="flex min-h-9 min-w-0 flex-1 items-center justify-center border-r border-stone-200 px-2 font-mono text-xs font-bold tracking-wide transition hover:brightness-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-800"
                  style={{ backgroundColor: swatchHex, color: codeOnSwatchColor }}
                  type="button"
                  onClick={() => onActiveColorChange(item.code)}
                >
                  {item.code}
                </button>
                <button
                  aria-label={`Replace ${item.code} with active color ${activeColor}`}
                  className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center border-r border-stone-200 bg-white text-amber-800 transition hover:bg-amber-100/90 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-800"
                  title={`Replace ${item.code} with ${activeColor}`}
                  type="button"
                  onClick={() => onApplyReplace(item.code)}
                >
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  aria-label={`Delete ${item.code} from pattern`}
                  className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center bg-white text-red-800 transition hover:bg-red-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-800"
                  title={`Delete ${item.code}`}
                  type="button"
                  onClick={() => onApplyDelete(item.code)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <MardPaletteGrid activeColor={activeColor} className="min-h-0 w-full shrink-0" onSelectColor={onActiveColorChange} />

      <section aria-label="History timeline" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white p-2">
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">History</h2>
          <div className="flex gap-1">
            <button
              aria-label="Undo"
              className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-stone-800 transition hover:bg-stone-100"
              type="button"
              onClick={onUndo}
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Redo"
              className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-stone-800 transition hover:bg-stone-100"
              type="button"
              onClick={onRedo}
            >
              <Redo2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {historyEntries.map((entry, index) => (
            <button
              aria-current={index === activeHistoryIndex ? "step" : undefined}
              className={cn(
                "rounded-lg px-2 py-1.5 text-left text-xs transition",
                index === activeHistoryIndex ? "bg-amber-100 font-semibold text-amber-950" : "bg-stone-50 text-stone-700 hover:bg-stone-100"
              )}
              key={entry.id}
              type="button"
              onClick={() => onJumpToHistory(index)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
