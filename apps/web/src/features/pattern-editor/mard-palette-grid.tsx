"use client";

import { useId, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { mardPalette, type BeadColor } from "@perlerloom/palettes";
import { readableTextHexOnBackgroundHex } from "@perlerloom/core";
import { cn } from "@perlerloom/ui";
import {
  drawingColorChromeBorderColorWhenActiveClass,
  drawingColorChromeBorderColorWhenIdleClass,
  drawingColorChromeBorderWidthClass
} from "./active-drawing-color-chrome";

function beadCodeLetterPrefix(code: string): string {
  const match = /^([A-Za-z]+)/.exec(code);
  return match !== null ? match[1] : "";
}

/** Digits after the letter prefix, e.g. `A10` → 10, `ZG1` → 1. Missing / invalid → 0 for sort stability. */
function beadCodeTrailingNumber(code: string): number {
  const match = /^[A-Za-z]+(\d+)$/.exec(code);
  if (match === null) {
    return 0;
  }
  return Number(match[1]);
}

function sortBeadColorsByCodeNumber(colors: readonly BeadColor[]): BeadColor[] {
  return [...colors].sort((left, right) => {
    const numberDelta = beadCodeTrailingNumber(left.code) - beadCodeTrailingNumber(right.code);
    if (numberDelta !== 0) {
      return numberDelta;
    }
    return left.code.localeCompare(right.code, undefined, { sensitivity: "base", numeric: true });
  });
}

function buildMardPaletteLetterGroups(palette: readonly BeadColor[]): { prefix: string; colors: BeadColor[] }[] {
  const bucket = new Map<string, BeadColor[]>();
  const prefixOrder: string[] = [];

  for (const color of palette) {
    const prefix = beadCodeLetterPrefix(color.code);
    if (!bucket.has(prefix)) {
      bucket.set(prefix, []);
      prefixOrder.push(prefix);
    }
    bucket.get(prefix)!.push(color);
  }

  return [...prefixOrder]
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
    .map((prefix) => ({
      prefix,
      colors: sortBeadColorsByCodeNumber(bucket.get(prefix) ?? [])
    }));
}

type MardPaletteGridProps = {
  activeColor: string;
  onSelectColor: (code: string) => void;
  className?: string;
  /** Omit outer card chrome and heading (e.g. inside a menu). */
  embedded?: boolean;
};

export function MardPaletteGrid({
  activeColor,
  onSelectColor,
  className,
  embedded = false
}: MardPaletteGridProps): React.ReactElement {
  const panelIdPrefix = useId().replaceAll(":", "");
  const letterGroups = useMemo(() => buildMardPaletteLetterGroups(mardPalette), []);
  const [expandedPrefixes, setExpandedPrefixes] = useState<Set<string>>(() => new Set());

  function togglePrefix(prefix: string): void {
    setExpandedPrefixes((previous) => {
      const next = new Set(previous);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  }

  const groupsList = (
    <div className="flex flex-col">
      {letterGroups.map(({ prefix, colors }) => {
        const isExpanded = expandedPrefixes.has(prefix);
        const firstColor = colors[0];
        const panelId = `${panelIdPrefix}-mard-palette-group-${prefix}`;

        return (
          <div className="min-w-0" key={prefix}>
            <button
              aria-controls={panelId}
              aria-expanded={isExpanded}
              className="flex w-full items-center gap-2 py-1.5 pl-0.5 pr-1 text-left leading-snug transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-800"
              type="button"
              onClick={() => togglePrefix(prefix)}
            >
              <ChevronRight
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0 text-stone-400 transition-transform", isExpanded && "rotate-90")}
              />
              <span className="font-mono text-sm font-bold tracking-wide text-stone-900">{prefix}</span>
              <span className="text-[10px] font-medium tabular-nums text-stone-400">{colors.length}</span>
              {firstColor !== undefined ? (
                <span
                  aria-hidden="true"
                  className="ml-auto h-5 w-5 shrink-0 rounded-sm border border-stone-200/90"
                  style={{ backgroundColor: firstColor.hex }}
                  title={`First in group: ${firstColor.code}`}
                />
              ) : null}
            </button>

            {isExpanded ? (
              <div className="pb-1.5 pl-0.5 pt-0.5" id={panelId}>
                <div
                  className="grid auto-rows-max gap-1"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(2.25rem, 1fr))"
                  }}
                >
                  {colors.map((color) => {
                    const isActive = activeColor === color.code;
                    const labelColor = readableTextHexOnBackgroundHex(color.hex);
                    return (
                      <button
                        aria-label={`Select palette color ${color.code}`}
                        aria-pressed={isActive}
                        className={cn(
                          "flex aspect-square min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md px-1 py-0.5 text-center font-mono text-xs font-bold tracking-wide transition hover:brightness-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-violet-800",
                          drawingColorChromeBorderWidthClass,
                          isActive ? drawingColorChromeBorderColorWhenActiveClass : drawingColorChromeBorderColorWhenIdleClass
                        )}
                        key={color.code}
                        style={{
                          backgroundColor: color.hex,
                          color: labelColor
                        }}
                        type="button"
                        onClick={() => onSelectColor(color.code)}
                      >
                        <span className="block min-w-0 max-w-full truncate">{color.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  const paletteBody = (
    <div className={cn("flex flex-col", embedded && "px-1 pb-1 pt-0.5")}>
      {groupsList}
    </div>
  );

  if (embedded) {
    return <div className={cn("flex min-w-0 w-full shrink-0 flex-col", className)}>{paletteBody}</div>;
  }

  return (
    <section aria-label="Mard palette" className={cn("flex w-full shrink-0 flex-col rounded-xl border border-stone-200 bg-white p-2", className)}>
      <h2 className="mb-1.5 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-500">Mard palette</h2>
      {paletteBody}
    </section>
  );
}
