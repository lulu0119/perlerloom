"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ImageIcon, Sparkles, UploadCloud, X } from "lucide-react";
import type { PatternSettings } from "@perlerloom/core";
import { mardPalette } from "@perlerloom/palettes";
import { cn } from "@perlerloom/ui";

export type ResizeMode = "original" | "dimensions" | "scale";

export type SelectedSourceImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type GenerateImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSourceImage: SelectedSourceImage | null;
  resizeMode: ResizeMode;
  onResizeModeChange: (mode: ResizeMode) => void;
  targetWidthInput: string;
  onTargetWidthInputChange: (value: string) => void;
  targetHeightInput: string;
  onTargetHeightInputChange: (value: string) => void;
  scalePercentInput: string;
  onScalePercentInputChange: (value: string) => void;
  settings: PatternSettings;
  onTargetColorCountChange: (value: string) => void;
  onMatchingSpaceChange: (value: string) => void;
  onClusteringSpaceChange: (value: string) => void;
  onDownsamplingModeChange: (value: string) => void;
  onDitheringEnabledChange: (checked: boolean) => void;
  maxPatternDimension: number;
  isGenerating: boolean;
  message: string;
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
  onGenerate: () => void;
};

export function GenerateImportDialog({
  open,
  onOpenChange,
  selectedSourceImage,
  resizeMode,
  onResizeModeChange,
  targetWidthInput,
  onTargetWidthInputChange,
  targetHeightInput,
  onTargetHeightInputChange,
  scalePercentInput,
  onScalePercentInputChange,
  settings,
  onTargetColorCountChange,
  onMatchingSpaceChange,
  onClusteringSpaceChange,
  onDownsamplingModeChange,
  onDitheringEnabledChange,
  maxPatternDimension,
  isGenerating,
  message,
  onFileInputChange,
  onDrop,
  onGenerate
}: GenerateImportDialogProps): React.ReactElement | null {
  const uploadLabelRef = useRef<HTMLLabelElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      uploadLabelRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previouslyFocusedRef.current?.focus?.();
      previouslyFocusedRef.current = null;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button
        aria-label="Dismiss import dialog"
        className="absolute inset-0 bg-black/40"
        type="button"
        onClick={() => onOpenChange(false)}
      />
      <div
        aria-labelledby="generate-import-dialog-title"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(100dvh-1rem,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-amber-200 bg-white text-stone-950 shadow-xl sm:max-h-[min(100dvh-2rem,40rem)] sm:rounded-2xl"
        role="dialog"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onOpenChange(false);
          }
        }}
      >
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-amber-100 px-4 py-3">
            <div>
              <h2 className="text-lg font-bold" id="generate-import-dialog-title">
                New / Import
              </h2>
              <p className="mt-0.5 text-xs text-stone-600">Upload a source image, set size and preprocessing, then generate.</p>
            </div>
            <button
              aria-label="Close dialog"
              className="rounded-full border border-stone-200 p-2 text-stone-600 transition hover:bg-stone-50"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <section aria-label="Upload and preview" className="space-y-3">
              <label
                ref={uploadLabelRef}
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 text-center transition hover:border-amber-500 hover:bg-amber-100/70"
                tabIndex={-1}
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDrop}
              >
                <UploadCloud className="h-8 w-8 text-amber-700" aria-hidden="true" />
                <span className="mt-2 text-sm font-semibold">Drop image here or click to upload</span>
                <span className="mt-1 text-xs text-stone-600">PNG, JPEG, or another browser-supported image</span>
                <input aria-label="Choose source image" className="sr-only" type="file" accept="image/*" onChange={onFileInputChange} />
              </label>

              {selectedSourceImage !== null ? (
                <div className="rounded-xl border border-stone-200 bg-white p-2">
                  <div className="relative h-32 overflow-hidden rounded-lg bg-stone-100">
                    <Image alt="Selected source image" className="object-contain" fill sizes="280px" src={selectedSourceImage.previewUrl} unoptimized />
                  </div>
                  <p className="mt-2 text-xs font-medium text-stone-700">
                    Source: {selectedSourceImage.width} × {selectedSourceImage.height} px
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                  <ImageIcon className="mb-1 h-4 w-4 text-stone-500" aria-hidden="true" />
                  Image preview appears here before generation.
                </div>
              )}
            </section>

            <section aria-label="Pattern size" className="space-y-2 rounded-xl bg-stone-50 p-3">
              <h3 className="text-sm font-semibold">Pattern size</h3>
              <p className="text-xs text-stone-600">Images up to {maxPatternDimension} × {maxPatternDimension} keep their source size by default. Larger images need an explicit target.</p>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(["original", "dimensions", "scale"] as ResizeMode[]).map((mode) => (
                  <label className="rounded-lg border border-stone-200 bg-white px-2 py-1.5" key={mode}>
                    <input className="mr-1" checked={resizeMode === mode} name="resize-mode-dialog" type="radio" onChange={() => onResizeModeChange(mode)} />
                    {mode === "original" ? "Original" : mode === "dimensions" ? "W/H" : "Scale"}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium">
                  Target width
                  <input aria-label="Target width" className="mt-1 w-full rounded-lg border border-stone-300 p-1.5 text-sm" max={maxPatternDimension} min={1} type="number" value={targetWidthInput} onChange={(event) => onTargetWidthInputChange(event.currentTarget.value)} />
                </label>
                <label className="text-xs font-medium">
                  Target height
                  <input aria-label="Target height" className="mt-1 w-full rounded-lg border border-stone-300 p-1.5 text-sm" type="number" value={targetHeightInput} onChange={(event) => onTargetHeightInputChange(event.currentTarget.value)} />
                </label>
              </div>
              <label className="block text-xs font-medium">
                Scale factor
                <input aria-label="Scale factor" className="mt-1 w-full rounded-lg border border-stone-300 p-1.5 text-sm" max={100} min={1} type="number" value={scalePercentInput} onChange={(event) => onScalePercentInputChange(event.currentTarget.value)} />
              </label>
              <label className="block text-xs font-medium">
                Downsampling method
                <select
                  aria-label="Downsampling method"
                  className="mt-1 w-full rounded-lg border border-stone-300 p-1.5 text-sm"
                  value={settings.downsamplingMode}
                  onChange={(event) => onDownsamplingModeChange(event.currentTarget.value)}
                >
                  <option value="nearest">Nearest neighbor</option>
                  <option value="gridMode">Grid mode</option>
                </select>
              </label>
            </section>

            <section aria-label="Preprocessing options" className="space-y-2 rounded-xl bg-stone-50 p-3">
              <h3 className="text-sm font-semibold">Preprocessing</h3>
              <p className="text-xs text-stone-600">Local conversion is active. Dithering starts off for cleaner bead charts.</p>
              <label className="block text-xs font-medium">
                Target colors
                <input aria-label="Target colors" className="mt-1 w-full rounded-lg border border-stone-300 p-1.5 text-sm" min={1} max={mardPalette.length} type="number" value={settings.targetColorCount} onChange={(event) => onTargetColorCountChange(event.currentTarget.value)} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-medium">
                  Match space
                  <select aria-label="Match space" className="mt-1 w-full rounded-lg border border-stone-300 p-1.5 text-sm" value={settings.matchingSpace} onChange={(event) => onMatchingSpaceChange(event.currentTarget.value)}>
                    <option value="rgb">RGB</option>
                    <option value="lab">Lab</option>
                    <option value="hsl">HSL</option>
                  </select>
                </label>
                <label className="block text-xs font-medium">
                  Cluster space
                  <select aria-label="Cluster space" className="mt-1 w-full rounded-lg border border-stone-300 p-1.5 text-sm" value={settings.clusteringSpace} onChange={(event) => onClusteringSpaceChange(event.currentTarget.value)}>
                    <option value="rgb">RGB</option>
                    <option value="lab">Lab</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input aria-label="Enable dithering" checked={settings.ditheringEnabled} type="checkbox" onChange={(event) => onDitheringEnabledChange(event.currentTarget.checked)} />
                Enable dithering
              </label>
              <button className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500" disabled type="button">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                AI cleanup requires sign-in
              </button>
            </section>

            <p className={cn("rounded-xl px-3 py-2 text-xs", message.includes("failed") || message.includes("before") ? "bg-amber-50 text-amber-950" : "bg-stone-100 text-stone-700")}>{message}</p>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
              disabled={selectedSourceImage === null || isGenerating}
              type="button"
              onClick={onGenerate}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isGenerating ? "Generating…" : "Generate pattern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
