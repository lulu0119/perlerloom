"use client";

import { ChevronDown, Eraser, Hand, Minus, PaintBucket, Pencil, Pipette } from "lucide-react";
import type { PatternDocument, PatternPoint } from "@perlerloom/core";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@perlerloom/ui";
import { MardPaletteGrid } from "./mard-palette-grid";

export type ChartHudTool = "pencil" | "eraser" | "eyedropper" | "paintBucket" | "hand" | "line";

type ChartToolHudProps = {
  activeTool: ChartHudTool;
  activeColor: string;
  onActiveColorChange: (code: string) => void;
  pattern: PatternDocument;
  eyedropperHoverCell: PatternPoint | null;
  paletteByCode: Map<string, { hex: string }>;
};

function ChartHudToolGlyph({ tool }: { tool: ChartHudTool }): ReactElement {
  const className = "text-muted-foreground h-3.5 w-3.5";
  if (tool === "paintBucket") {
    return <PaintBucket className={className} aria-hidden />;
  }
  if (tool === "eraser") {
    return <Eraser className={className} aria-hidden />;
  }
  if (tool === "eyedropper") {
    return <Pipette className={className} aria-hidden />;
  }
  if (tool === "hand") {
    return <Hand className={className} aria-hidden />;
  }
  if (tool === "line") {
    return <Minus className={className} aria-hidden />;
  }
  return <Pencil className={className} aria-hidden />;
}

export function ChartToolHud({
  activeTool,
  activeColor,
  onActiveColorChange,
  pattern,
  eyedropperHoverCell,
  paletteByCode
}: ChartToolHudProps): ReactElement {
  const { t } = useTranslation();
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const isHand = activeTool === "hand";
  const showsDrawingColorSelect = !isHand && activeTool !== "eraser";

  const activeHex = paletteByCode.get(activeColor)?.hex ?? "#e7e5e4";

  const hoverIndex =
    eyedropperHoverCell !== null ? eyedropperHoverCell.row * pattern.width + eyedropperHoverCell.column : null;
  const hoverCode = hoverIndex !== null ? pattern.cells[hoverIndex] ?? null : null;
  const hoverHex = hoverCode !== null ? (paletteByCode.get(hoverCode)?.hex ?? "#ffffff") : "#f5f5f4";

  let centerSlot: ReactNode;
  if (activeTool === "hand") {
    centerSlot = <span>{t("chartHud.hand")}</span>;
  } else if (activeTool === "eyedropper") {
    centerSlot = (
      <div className="flex min-w-0 items-center gap-1.5" data-testid="chart-eyedropper-under-pointer">
        <span aria-live="polite" className="flex min-w-0 items-center gap-1.5">
          {eyedropperHoverCell === null ? (
            <span className="text-muted-foreground">{t("chartHud.eyedropperIdle")}</span>
          ) : hoverCode === null ? (
            <span className="text-muted-foreground">{t("chartHud.eyedropperEmpty")}</span>
          ) : (
            <>
              <span
                aria-hidden
                className="border-border h-3.5 w-3.5 shrink-0 rounded border shadow-inner"
                style={{ backgroundColor: hoverHex }}
              />
              <span className="text-foreground truncate font-mono font-semibold">{hoverCode}</span>
            </>
          )}
        </span>
      </div>
    );
  } else if (activeTool === "pencil") {
    centerSlot = <span>{t("chartHud.pencil")}</span>;
  } else if (activeTool === "eraser") {
    centerSlot = <span>{t("chartHud.eraser")}</span>;
  } else if (activeTool === "paintBucket") {
    centerSlot = <span>{t("chartHud.bucket")}</span>;
  } else {
    centerSlot = <span>{t("chartHud.line")}</span>;
  }

  return (
    <div
      className="border-border divide-border flex h-8 min-h-8 max-h-8 min-w-0 divide-x overflow-hidden rounded-full border bg-white"
      data-testid="chart-tool-hud"
      role="region"
      aria-label={t("chartHud.regionLabel")}
    >
      <div className="bg-muted/80 flex w-8 shrink-0 items-center justify-center">
        <ChartHudToolGlyph tool={activeTool} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 items-center overflow-hidden px-2">
        <div className="text-muted-foreground line-clamp-1 min-h-0 min-w-0 text-[11px] leading-tight [&_strong]:font-semibold [&_strong]:text-foreground">
          {centerSlot}
        </div>
      </div>
      {showsDrawingColorSelect ? (
        <div className="bg-muted/60 flex w-[7.5rem] shrink-0 items-stretch pl-0.5 pr-0.5">
          <DropdownMenu open={colorMenuOpen} onOpenChange={setColorMenuOpen}>
            <DropdownMenuTrigger
              type="button"
              data-testid="chart-drawing-color-select"
              className="text-foreground inline-flex h-full min-h-0 w-full min-w-0 items-center gap-1 rounded-none border-0 bg-transparent px-1 text-left font-mono text-[11px] font-semibold leading-none shadow-none outline-none hover:bg-muted/90 focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
            >
              <span
                aria-hidden
                className="border-border h-3.5 w-3.5 shrink-0 rounded border shadow-inner"
                style={{ backgroundColor: activeHex }}
              />
              <span className="min-w-0 flex-1 truncate">{activeColor}</span>
              <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={6}
              className="max-h-[min(80dvh,28rem)] w-[min(22rem,calc(100vw-2rem))] min-w-[17rem] overflow-y-auto overscroll-contain p-0"
            >
              <MardPaletteGrid
                embedded
                activeColor={activeColor}
                onSelectColor={(code) => {
                  onActiveColorChange(code);
                  setColorMenuOpen(false);
                }}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}
