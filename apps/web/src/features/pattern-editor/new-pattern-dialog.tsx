"use client";

import { useId, useState } from "react";
import type { ReactElement } from "react";
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

const defaultWidth = 8;
const defaultHeight = 8;

type NewPatternDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxDimension: number;
  onConfirm: (width: number, height: number) => void;
};

export function NewPatternDialog({ open, onOpenChange, maxDimension, onConfirm }: NewPatternDialogProps): ReactElement {
  const widthFieldId = useId();
  const heightFieldId = useId();
  const [widthInput, setWidthInput] = useState(String(defaultWidth));
  const [heightInput, setHeightInput] = useState(String(defaultHeight));
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(): void {
    const width = Number(widthInput.trim());
    const height = Number(heightInput.trim());
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      setError("Width and height must be whole numbers.");
      return;
    }
    if (width < 1 || height < 1 || width > maxDimension || height > maxDimension) {
      setError(`Use sizes between 1 and ${maxDimension}.`);
      return;
    }
    setError(null);
    onConfirm(width, height);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-w-md rounded-2xl border-amber-200 bg-white text-stone-950">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-stone-950">New pattern</DialogTitle>
          <DialogDescription className="text-xs text-stone-600">
            Choose the grid size in beads. You can paint the empty grid with the pencil and other tools.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-stone-900" htmlFor={widthFieldId}>
              Width (beads)
            </Label>
            <Input
              id={widthFieldId}
              aria-label="Pattern width in beads"
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
            <Label className="text-xs text-stone-900" htmlFor={heightFieldId}>
              Height (beads)
            </Label>
            <Input
              id={heightFieldId}
              aria-label="Pattern height in beads"
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
            Cancel
          </Button>
          <Button className="rounded-full bg-stone-950 text-white hover:bg-stone-900" type="button" onClick={handleConfirm}>
            Create grid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
