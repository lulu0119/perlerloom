"use client";

import { I18nextProvider } from "react-i18next";
import { useEffect } from "react";
import i18n from "./config";

function syncDocumentToLanguage(): void {
  const language = i18n.language;
  const htmlLang = language.startsWith("zh") ? "zh-CN" : "en";
  document.documentElement.lang = htmlLang;
  document.title = i18n.t("meta.title");
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription !== null) {
    metaDescription.setAttribute("content", i18n.t("meta.description"));
  }
}

export function I18nProvider({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  useEffect(() => {
    syncDocumentToLanguage();
    i18n.on("languageChanged", syncDocumentToLanguage);
    return () => {
      i18n.off("languageChanged", syncDocumentToLanguage);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
