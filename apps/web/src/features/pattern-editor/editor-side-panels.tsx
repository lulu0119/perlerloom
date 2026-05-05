"use client";

import type { ReactElement } from "react";
import { ArrowLeftRight, Redo2, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { readableTextHexOnBackgroundHex, type PatternLegendItem } from "@perlerloom/core";
import { cn } from "@perlerloom/ui";
import {
  drawingColorChromeBorderColorWhenActiveClass,
  drawingColorChromeBorderColorWhenIdleClass,
  drawingColorChromeBorderWidthClass
} from "./active-drawing-color-chrome";
import type { HistoryEntry } from "./pattern-editor-utils";
import { MardPaletteGrid } from "./mard-palette-grid";

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
}: EditorSidePanelsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-3", className)}>
      {legend.length > 0 ? (
        <section aria-label={t("sidePanels.legendAria")} className="border-border bg-muted/80 shrink-0 rounded-xl border p-2">
          <h2 className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">{t("sidePanels.usedInChart")}</h2>
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
                    aria-label={t("sidePanels.legendSelect", { code: item.code, count: item.count })}
                    aria-pressed={isActiveChip}
                    className="border-border flex min-h-9 min-w-9 shrink-0 flex-col items-center justify-center gap-0 border-r px-1 py-0.5 text-center font-mono transition hover:brightness-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    style={{ backgroundColor: swatchHex, color: codeOnSwatchColor }}
                    type="button"
                    onClick={() => onActiveColorChange(item.code)}
                  >
                    <span className="text-xs font-bold tabular-nums tracking-wide">{item.code}</span>
                    <span className="text-[10px] font-semibold tabular-nums leading-none">{item.count}</span>
                  </button>
                  <button
                    aria-label={t("sidePanels.legendReplace", { fromCode: item.code, activeColor })}
                    className="border-border text-brand-accent hover:bg-accent/90 inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center border-r bg-white transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    title={t("sidePanels.legendReplaceTitle", { fromCode: item.code, activeColor })}
                    type="button"
                    onClick={() => onApplyReplace(item.code)}
                  >
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    aria-label={t("sidePanels.legendDelete", { fromCode: item.code })}
                    className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center bg-white text-red-800 transition hover:bg-red-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    title={t("sidePanels.legendDeleteTitle", { fromCode: item.code })}
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
      ) : null}

      <MardPaletteGrid activeColor={activeColor} className="w-full shrink-0" onSelectColor={onActiveColorChange} />

      <section aria-label={t("sidePanels.historyTimelineAria")} className="border-border flex shrink-0 flex-col rounded-xl border bg-white p-2">
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{t("sidePanels.history")}</h2>
          <div className="flex gap-1">
            <button
              aria-label={t("sidePanels.undo")}
              className="border-border bg-muted text-foreground rounded-lg border p-1.5 transition hover:bg-muted/80"
              type="button"
              onClick={onUndo}
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              aria-label={t("sidePanels.redo")}
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
              {t(entry.labelKey)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
