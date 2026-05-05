"use client";

import type { ReactElement } from "react";
import { Blocks, ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@perlerloom/ui";

type EditorWelcomeProps = {
  onImportImage: () => void;
  onCreateNewPattern: () => void;
};

export function EditorWelcome({ onImportImage, onCreateNewPattern }: EditorWelcomeProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="bg-brand-surface-muted flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="max-w-md text-center">
        <h2 className="text-foreground font-sans text-xl font-semibold md:text-2xl">{t("welcome.title")}</h2>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">{t("welcome.body")}</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        <Button className="h-11 rounded-full px-6 text-sm font-semibold" type="button" onClick={onImportImage}>
          <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("welcome.importImage")}
        </Button>
        <Button className="h-11 rounded-full px-6 text-sm font-semibold" type="button" variant="outline" onClick={onCreateNewPattern}>
          <Blocks className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("welcome.createNewPattern")}
        </Button>
      </div>
    </div>
  );
}
