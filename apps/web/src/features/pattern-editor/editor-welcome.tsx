"use client";

import type { ReactElement } from "react";
import { ImagePlus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

type EditorWelcomeProps = {
  onImportImage: () => void;
  onCreateNewPattern: () => void;
};

export function EditorWelcome({ onImportImage, onCreateNewPattern }: EditorWelcomeProps): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-[#f1eadf] px-4 py-10 md:bg-[#f8efe3]">
      <div className="max-w-md text-center">
        <h2 className="font-sans text-xl font-semibold text-stone-900 md:text-2xl">Start a bead chart</h2>
        <p className="mt-2 text-sm text-stone-600 md:text-base">
          Import a photo to match colors to beads, or create an empty grid and paint it yourself.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          className="h-11 rounded-full bg-stone-950 px-6 text-sm font-semibold text-white hover:bg-stone-900"
          type="button"
          onClick={onImportImage}
        >
          <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Import image
        </Button>
        <Button
          className="h-11 rounded-full border-stone-300 bg-white px-6 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          type="button"
          variant="outline"
          onClick={onCreateNewPattern}
        >
          <LayoutGrid className="mr-2 h-4 w-4" aria-hidden="true" />
          Create new pattern
        </Button>
      </div>
    </div>
  );
}
