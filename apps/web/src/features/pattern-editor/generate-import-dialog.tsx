"use client";

import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { ImageIcon, ImagePlus, Layers, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PatternSettings } from "@douloom/core";
import {
  Button,
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
} from "@douloom/ui";

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
  maxPatternDimension: number;
  isGenerating: boolean;
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
  onGenerate: () => void;
  onImportPatternJson: (file: File) => void | Promise<void>;
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
  targetColorCountInput,
  onTargetColorCountInputChange,
  onTargetColorCountInputBlur,
  importSettings,
  onMatchingSpaceChange,
  onClusteringSpaceChange,
  onDownsamplingModeChange,
  maxPatternDimension,
  isGenerating,
  onFileInputChange,
  onDrop,
  onGenerate,
  onImportPatternJson
}: GenerateImportDialogProps): ReactElement {
  const { t } = useTranslation();
  const uploadLabelRef = useRef<HTMLLabelElement>(null);
  const patternJsonInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const resizeModeOptions: { mode: ResizeMode; labelKey: "importDialog.resizeOriginal" | "importDialog.resizeDimensions" | "importDialog.resizeScale" }[] = [
    { mode: "original", labelKey: "importDialog.resizeOriginal" },
    { mode: "dimensions", labelKey: "importDialog.resizeDimensions" },
    { mode: "scale", labelKey: "importDialog.resizeScale" }
  ];

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
        closeLabel={t("dialog.close")}
        className={cn(
          "flex max-h-[min(90dvh,40rem)] w-[calc(100%-1.5rem)] max-w-md flex-col gap-0 overflow-hidden rounded-t-2xl border-border bg-white p-0 text-foreground shadow-xl sm:rounded-2xl"
        )}
      >
        <DialogHeader className="border-border shrink-0 border-b px-4 py-3 text-left">
          <DialogTitle className="text-lg font-bold text-foreground">{t("importDialog.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">{t("importDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section aria-labelledby="import-open-saved-heading" className="bg-muted space-y-2 rounded-xl p-3">
            <h3 className="text-foreground text-sm font-semibold" id="import-open-saved-heading">
              {t("importDialog.sectionOpenSavedChart")}
            </h3>
            <p className="text-muted-foreground text-xs">{t("library.importSavedHint")}</p>
            <input
              accept="application/json,.json"
              aria-label={t("library.importJson")}
              className="sr-only"
              ref={patternJsonInputRef}
              type="file"
              onChange={() => {
                const input = patternJsonInputRef.current;
                const file = input?.files?.[0];
                if (file !== undefined) {
                  void Promise.resolve(onImportPatternJson(file));
                }
                if (input !== null) {
                  input.value = "";
                }
              }}
            />
            <Button
              className="h-auto w-full rounded-full py-2.5 text-sm font-semibold"
              type="button"
              variant="outline"
              onClick={() => patternJsonInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("library.importJson")}
            </Button>
          </section>

          <section aria-labelledby="import-from-photo-heading" className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold" id="import-from-photo-heading">
              {t("importDialog.sectionFromPhoto")}
            </h3>
            <Label
              ref={uploadLabelRef}
              className="border-primary/40 bg-accent/70 hover:border-primary hover:bg-accent flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center font-normal transition"
              tabIndex={-1}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <ImagePlus className="text-brand-accent h-8 w-8" aria-hidden="true" />
              <span className="text-foreground mt-2 text-sm font-semibold">{t("importDialog.dropHint")}</span>
              <span className="text-muted-foreground mt-1 text-xs">{t("importDialog.formatsHint")}</span>
              <input aria-label={t("importDialog.chooseSourceImage")} className="sr-only" type="file" accept="image/*" onChange={onFileInputChange} />
            </Label>

            {selectedSourceImage !== null ? (
              <div className="border-border rounded-xl border bg-white p-2">
                <div className="bg-muted relative h-32 overflow-hidden rounded-lg">
                  <Image
                    alt={t("importDialog.selectedSourceAlt")}
                    className="object-contain"
                    fill
                    sizes="280px"
                    src={selectedSourceImage.previewUrl}
                    unoptimized
                  />
                </div>
                <p className="text-foreground mt-2 text-xs font-medium">
                  {t("importDialog.sourceDimensions", { width: selectedSourceImage.width, height: selectedSourceImage.height })}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">{t("importDialog.previewNote")}</p>
              </div>
            ) : (
              <div className="border-border bg-muted rounded-xl border p-3 text-xs text-muted-foreground">
                <ImageIcon className="text-muted-foreground mb-1 h-4 w-4" aria-hidden="true" />
                {t("importDialog.emptyPreviewHint")}
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section aria-label={t("importDialog.sectionPatternSize")} className="bg-muted space-y-3 rounded-xl p-3">
              <h3 className="text-foreground text-sm font-semibold">{t("importDialog.patternSizeHeading")}</h3>
              <p className="text-muted-foreground text-xs">
                {t("importDialog.patternSizeIntro", { max: maxPatternDimension })}
              </p>
              <RadioGroup
                className="grid grid-cols-3 gap-1.5"
                value={resizeMode}
                onValueChange={(value) => onResizeModeChange(value as ResizeMode)}
              >
                {resizeModeOptions.map(({ mode, labelKey }) => (
                  <Label
                    key={mode}
                    className={cn(
                      "border-border bg-card text-foreground flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-normal",
                      resizeMode === mode && "border-primary bg-accent/90"
                    )}
                    htmlFor={`import-resize-${mode}`}
                  >
                    <RadioGroupItem value={mode} id={`import-resize-${mode}`} className="border-input" />
                    <span>{t(labelKey)}</span>
                  </Label>
                ))}
              </RadioGroup>
              {resizeMode === "dimensions" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs" htmlFor="import-target-width">
                      {t("importDialog.targetWidth")}
                    </Label>
                    <Input
                      aria-label={t("importDialog.targetWidth")}
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
                    <Label className="text-foreground text-xs" htmlFor="import-target-height">
                      {t("importDialog.targetHeight")}
                    </Label>
                    <Input
                      aria-label={t("importDialog.targetHeight")}
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
              ) : null}
              {resizeMode === "scale" ? (
                <div className="space-y-1">
                  <Label className="text-foreground text-xs" htmlFor="import-scale-percent">
                    {t("importDialog.scaleFactor")}
                  </Label>
                  <Input
                    aria-label={t("importDialog.scaleFactor")}
                    className="text-sm"
                    id="import-scale-percent"
                    max={100}
                    min={1}
                    type="number"
                    value={scalePercentInput}
                    onChange={(event) => onScalePercentInputChange(event.currentTarget.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label className="text-foreground text-xs" htmlFor="import-downsample-trigger">
                  {t("importDialog.downsamplingMethod")}
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
                      {importSettings.downsamplingMode === "nearest" ? t("importDialog.nearestNeighbor") : t("importDialog.gridMode")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nearest">{t("importDialog.nearestNeighbor")}</SelectItem>
                    <SelectItem value="gridMode">{t("importDialog.gridMode")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section aria-label={t("importDialog.sectionPreprocessing")} className="bg-muted space-y-3 rounded-xl p-3">
              <h3 className="text-foreground text-sm font-semibold">{t("importDialog.preprocessingHeading")}</h3>
              <p className="text-muted-foreground text-xs">{t("importDialog.preprocessingIntro")}</p>
              <div className="space-y-1">
                <Label className="text-foreground text-xs" htmlFor="import-target-colors">
                  {t("importDialog.targetColors")}
                </Label>
                <Input
                  aria-describedby="import-target-colors-hint"
                  aria-label={t("importDialog.targetColors")}
                  autoComplete="off"
                  className="text-sm"
                  id="import-target-colors"
                  inputMode="numeric"
                  type="text"
                  value={targetColorCountInput}
                  onBlur={onTargetColorCountInputBlur}
                  onChange={(event) => onTargetColorCountInputChange(event.currentTarget.value)}
                />
                <p className="text-muted-foreground text-[11px] leading-snug" id="import-target-colors-hint">
                  {t("importDialog.targetColorsHint")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs" htmlFor="import-match-trigger">
                    {t("importDialog.matchSpace")}
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
                  <Label className="text-foreground text-xs" htmlFor="import-cluster-trigger">
                    {t("importDialog.clusterSpace")}
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
            </section>

            <Button
              className="h-auto w-full rounded-full py-2.5 text-sm font-semibold"
              disabled={selectedSourceImage === null || isGenerating}
              type="button"
              onClick={onGenerate}
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              {isGenerating ? t("importDialog.generating") : t("importDialog.generatePattern")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
