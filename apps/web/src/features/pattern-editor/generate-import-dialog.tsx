"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ImageIcon, Layers, UploadCloud } from "lucide-react";
import type { PatternSettings } from "@perlerloom/core";
import {
  Button,
  Checkbox,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@perlerloom/ui";

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
  targetColorCountInput: string;
  onTargetColorCountInputChange: (value: string) => void;
  onTargetColorCountInputBlur: () => void;
  importSettings: PatternSettings;
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

const resizeModeOptions: { mode: ResizeMode; label: string }[] = [
  { mode: "original", label: "Original" },
  { mode: "dimensions", label: "W/H" },
  { mode: "scale", label: "Scale" }
];

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
  targetColorCountInput,
  onTargetColorCountInputChange,
  onTargetColorCountInputBlur,
  importSettings,
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
}: GenerateImportDialogProps): React.ReactElement {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(90dvh,40rem)] w-[calc(100%-1.5rem)] max-w-md flex-col gap-0 overflow-hidden rounded-t-2xl border-amber-200 bg-white p-0 text-stone-950 shadow-xl sm:rounded-2xl"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-amber-100 px-4 py-3 text-left">
          <DialogTitle className="text-lg font-bold text-stone-950">New / Import</DialogTitle>
          <DialogDescription className="text-xs text-stone-600">
            Upload a source image, set size and preprocessing, then generate.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section aria-label="Upload and preview" className="space-y-3">
            <Label
              ref={uploadLabelRef}
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 text-center font-normal transition hover:border-amber-500 hover:bg-amber-100/70"
              tabIndex={-1}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <UploadCloud className="h-8 w-8 text-amber-700" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold text-stone-950">Drop image here or click to upload</span>
              <span className="mt-1 text-xs text-stone-600">PNG, JPEG, or another browser-supported image</span>
              <input aria-label="Choose source image" className="sr-only" type="file" accept="image/*" onChange={onFileInputChange} />
            </Label>

            {selectedSourceImage !== null ? (
              <div className="rounded-xl border border-stone-200 bg-white p-2">
                <div className="relative h-32 overflow-hidden rounded-lg bg-stone-100">
                  <Image alt="Selected source image" className="object-contain" fill sizes="280px" src={selectedSourceImage.previewUrl} unoptimized />
                </div>
                <p className="mt-2 text-xs font-medium text-stone-700">
                  Source: {selectedSourceImage.width} × {selectedSourceImage.height} px
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Preview is the uploaded image only; the bead grid appears after you tap Generate pattern.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                <ImageIcon className="mb-1 h-4 w-4 text-stone-500" aria-hidden="true" />
                Image preview appears here before generation.
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section aria-label="Pattern size" className="space-y-3 rounded-xl bg-stone-50 p-3">
              <h3 className="text-sm font-semibold text-stone-950">Pattern size</h3>
              <p className="text-xs text-stone-600">
                Images up to {maxPatternDimension} × {maxPatternDimension} keep their source size by default. Larger images need an explicit target.
              </p>
              <RadioGroup
                className="grid grid-cols-3 gap-1.5"
                value={resizeMode}
                onValueChange={(value) => onResizeModeChange(value as ResizeMode)}
              >
                {resizeModeOptions.map(({ mode, label }) => (
                  <Label
                    key={mode}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-normal text-stone-900",
                      resizeMode === mode && "border-amber-400 bg-amber-50/90"
                    )}
                    htmlFor={`import-resize-${mode}`}
                  >
                    <RadioGroupItem value={mode} id={`import-resize-${mode}`} className="border-stone-300" />
                    <span>{label}</span>
                  </Label>
                ))}
              </RadioGroup>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-stone-900" htmlFor="import-target-width">
                    Target width
                  </Label>
                  <Input
                    aria-label="Target width"
                    className="text-sm"
                    id="import-target-width"
                    max={maxPatternDimension}
                    min={1}
                    type="number"
                    value={targetWidthInput}
                    onChange={(event) => onTargetWidthInputChange(event.currentTarget.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone-900" htmlFor="import-target-height">
                    Target height
                  </Label>
                  <Input
                    aria-label="Target height"
                    className="text-sm"
                    id="import-target-height"
                    max={maxPatternDimension}
                    min={1}
                    type="number"
                    value={targetHeightInput}
                    onChange={(event) => onTargetHeightInputChange(event.currentTarget.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-900" htmlFor="import-scale-percent">
                  Scale factor
                </Label>
                <Input
                  aria-label="Scale factor"
                  className="text-sm"
                  id="import-scale-percent"
                  max={100}
                  min={1}
                  type="number"
                  value={scalePercentInput}
                  onChange={(event) => onScalePercentInputChange(event.currentTarget.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-900" htmlFor="import-downsample-trigger">
                  Downsampling method
                </Label>
                <Select
                  value={importSettings.downsamplingMode}
                  onValueChange={(value) => {
                    if (value !== null) {
                      onDownsamplingModeChange(value);
                    }
                  }}
                >
                  <SelectTrigger id="import-downsample-trigger" className="w-full" size="sm">
                    <SelectValue>
                      {importSettings.downsamplingMode === "nearest" ? "Nearest neighbor" : "Grid mode"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nearest">Nearest neighbor</SelectItem>
                    <SelectItem value="gridMode">Grid mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section aria-label="Preprocessing options" className="space-y-3 rounded-xl bg-stone-50 p-3">
              <h3 className="text-sm font-semibold text-stone-950">Preprocessing</h3>
              <p className="text-xs text-stone-600">
                Tune color count, match and cluster color space, downsampling, and optional dithering before generating.
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-stone-900" htmlFor="import-target-colors">
                  Target colors
                </Label>
                <Input
                  aria-describedby="import-target-colors-hint"
                  aria-label="Target colors"
                  autoComplete="off"
                  className="text-sm"
                  id="import-target-colors"
                  inputMode="numeric"
                  type="text"
                  value={targetColorCountInput}
                  onBlur={onTargetColorCountInputBlur}
                  onChange={(event) => onTargetColorCountInputChange(event.currentTarget.value)}
                />
                <p className="text-[11px] leading-snug text-stone-500" id="import-target-colors-hint">
                  This is how many k-means clusters are formed before each cluster center is snapped to the nearest bead
                  color. The chart can end up with fewer distinct bead codes when several clusters map to the same
                  palette entry.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-stone-900" htmlFor="import-match-trigger">
                    Match space
                  </Label>
                  <Select
                    value={importSettings.matchingSpace}
                    onValueChange={(value) => {
                      if (value !== null) {
                        onMatchingSpaceChange(value);
                      }
                    }}
                  >
                    <SelectTrigger id="import-match-trigger" className="w-full" size="sm">
                      <SelectValue>
                        {importSettings.matchingSpace === "rgb"
                          ? "RGB"
                          : importSettings.matchingSpace === "lab"
                            ? "Lab"
                            : "HSL"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rgb">RGB</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="hsl">HSL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone-900" htmlFor="import-cluster-trigger">
                    Cluster space
                  </Label>
                  <Select
                    value={importSettings.clusteringSpace}
                    onValueChange={(value) => {
                      if (value !== null) {
                        onClusteringSpaceChange(value);
                      }
                    }}
                  >
                    <SelectTrigger id="import-cluster-trigger" className="w-full" size="sm">
                      <SelectValue>{importSettings.clusteringSpace === "rgb" ? "RGB" : "Lab"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rgb">RGB</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="import-dithering"
                  checked={importSettings.ditheringEnabled}
                  onCheckedChange={(checked) => onDitheringEnabledChange(checked)}
                />
                <Label htmlFor="import-dithering" className="cursor-pointer text-xs font-normal text-stone-900">
                  Enable dithering
                </Label>
              </div>
            </section>

            <p
              className={cn(
                "rounded-xl px-3 py-2 text-xs",
                message.includes("failed") || message.includes("before") ? "bg-amber-50 text-amber-950" : "bg-stone-100 text-stone-700"
              )}
              role="status"
            >
              {message}
            </p>

            <Button
              className="h-auto w-full rounded-full bg-stone-950 py-2.5 text-sm font-semibold text-white hover:bg-stone-900 disabled:bg-stone-300"
              disabled={selectedSourceImage === null || isGenerating}
              type="button"
              onClick={onGenerate}
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              {isGenerating ? "Generating…" : "Generate pattern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
