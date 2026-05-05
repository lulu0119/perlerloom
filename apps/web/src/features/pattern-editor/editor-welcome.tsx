"use client";

import type { ReactElement } from "react";
import { ImagePlus, LayoutGrid } from "lucide-react";
import { Button } from "@perlerloom/ui";

type EditorWelcomeProps = {
  onImportImage: () => void;
  onCreateNewPattern: () => void;
};

export function EditorWelcome({ onImportImage, onCreateNewPattern }: EditorWelcomeProps): ReactElement {
  return (
    <div className="bg-brand-surface-muted flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="max-w-md text-center">
        <h2 className="text-foreground font-sans text-xl font-semibold md:text-2xl">Start a bead chart</h2>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Import a photo to match colors to beads, or create an empty grid and paint it yourself.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <Button className="h-11 rounded-full px-6 text-sm font-semibold" type="button" onClick={onImportImage}>
          <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Import image
        </Button>
        <Button className="h-11 rounded-full px-6 text-sm font-semibold" type="button" variant="outline" onClick={onCreateNewPattern}>
          <LayoutGrid className="mr-2 h-4 w-4" aria-hidden="true" />
          Create new pattern
        </Button>
      </div>
    </div>
  );
}
