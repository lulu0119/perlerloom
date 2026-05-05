"use client";

import type { ReactElement } from "react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from "@perlerloom/ui";

type NewPatternDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxDimension: number;
  onConfirm: (width: number, height: number) => void;
};

const defaultWidth = 8;
const defaultHeight = 8;

export function NewPatternDialog({ open, onOpenChange, maxDimension, onConfirm }: NewPatternDialogProps): ReactElement {
  const { t } = useTranslation();
  const widthFieldId = useId();
  const heightFieldId = useId();
  const [widthInput, setWidthInput] = useState(String(defaultWidth));
  const [heightInput, setHeightInput] = useState(String(defaultHeight));
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(): void {
    const width = Number(widthInput.trim());
    const height = Number(heightInput.trim());
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      setError(t("newPatternDialog.errors.wholeNumbers"));
      return;
    }
    if (width < 1 || height < 1 || width > maxDimension || height > maxDimension) {
      setError(t("newPatternDialog.errors.sizeRange", { max: maxDimension }));
      return;
    }
    setError(null);
    onConfirm(width, height);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        closeLabel={t("dialog.close")}
        className="border-border max-w-md rounded-2xl border bg-white text-foreground"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">{t("newPatternDialog.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">{t("newPatternDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-foreground text-xs" htmlFor={widthFieldId}>
              {t("newPatternDialog.widthLabel")}
            </Label>
            <Input
              id={widthFieldId}
              aria-label={t("newPatternDialog.widthAria")}
              className="text-sm"
              inputMode="numeric"
              min={1}
              max={maxDimension}
              type="number"
              value={widthInput}
              onChange={(event) => setWidthInput(event.currentTarget.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-foreground text-xs" htmlFor={heightFieldId}>
              {t("newPatternDialog.heightLabel")}
            </Label>
            <Input
              id={heightFieldId}
              aria-label={t("newPatternDialog.heightAria")}
              className="text-sm"
              inputMode="numeric"
              min={1}
              max={maxDimension}
              type="number"
              value={heightInput}
              onChange={(event) => setHeightInput(event.currentTarget.value)}
            />
          </div>
        </div>
        {error !== null ? (
          <p className="text-xs font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button className="rounded-full" type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("newPatternDialog.cancel")}
          </Button>
          <Button className="rounded-full" type="button" onClick={handleConfirm}>
            {t("newPatternDialog.createGrid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
