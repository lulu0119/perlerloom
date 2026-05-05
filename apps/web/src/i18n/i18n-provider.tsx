"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { LANGUAGE_STORAGE_KEY } from "./config";

function syncDocumentToLanguage(): void {
  const language = i18n.language;
  const htmlLang = language.startsWith("zh") ? "zh-CN" : "en";
  document.documentElement.lang = htmlLang;
  document.title = i18n.t("meta.title");
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription !== null) {
    metaDescription.setAttribute(
      "content",
      i18n.t("meta.description").replace(/\s*\n\s*/gu, " ").replace(/\s+/gu, " ").trim()
    );
  }
}

function resolvePreferredLanguage(): string {
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const raw = storedLanguage ?? navigator.language;
  const normalized = raw.toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh";
  }
  return "en";
}

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  useEffect(() => {
    void i18n.changeLanguage(resolvePreferredLanguage()).then(() => {
      syncDocumentToLanguage();
    });

    function handleLanguageChanged(lng: string): void {
      const normalized = lng.startsWith("zh") ? "zh" : "en";
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      syncDocumentToLanguage();
    }

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
