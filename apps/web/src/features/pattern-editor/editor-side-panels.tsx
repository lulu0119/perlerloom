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
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-3", className)}>
      <section aria-label="Legend badges" className="border-border bg-muted/80 shrink-0 rounded-xl border p-2">
        <h2 className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">Used in chart</h2>
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
                  className="border-border flex min-h-9 w-9 shrink-0 items-center justify-center border-r px-1 text-center font-mono text-xs font-bold tabular-nums tracking-wide transition hover:brightness-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  style={{ backgroundColor: swatchHex, color: codeOnSwatchColor }}
                  type="button"
                  onClick={() => onActiveColorChange(item.code)}
                >
                  {item.code}
                </button>
                <button
                  aria-label={`Replace ${item.code} with active color ${activeColor}`}
                  className="border-border text-brand-accent hover:bg-accent/90 inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center border-r bg-white transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  title={`Replace ${item.code} with ${activeColor}`}
                  type="button"
                  onClick={() => onApplyReplace(item.code)}
                >
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  aria-label={`Delete ${item.code} from pattern`}
                  className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center bg-white text-red-800 transition hover:bg-red-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
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

      <MardPaletteGrid activeColor={activeColor} className="w-full shrink-0" onSelectColor={onActiveColorChange} />

      <section aria-label="History timeline" className="border-border flex shrink-0 flex-col rounded-xl border bg-white p-2">
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">History</h2>
          <div className="flex gap-1">
            <button
              aria-label="Undo"
              className="border-border bg-muted text-foreground rounded-lg border p-1.5 transition hover:bg-muted/80"
              type="button"
              onClick={onUndo}
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Redo"
              className="border-border bg-muted text-foreground rounded-lg border p-1.5 transition hover:bg-muted/80"
              type="button"
              onClick={onRedo}
            >
              <Redo2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {historyEntries.map((entry, index) => (
            <button
              aria-current={index === activeHistoryIndex ? "step" : undefined}
              className={cn(
                "rounded-lg px-2 py-1.5 text-left text-xs transition",
                index === activeHistoryIndex
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-accent/40"
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
