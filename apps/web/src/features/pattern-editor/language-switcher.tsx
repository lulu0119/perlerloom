"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@perlerloom/ui";

export function LanguageSwitcher(): ReactElement {
  const { i18n, t } = useTranslation();

  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";

  return (
    <Select
      value={resolvedLanguage.startsWith("zh") ? "zh" : "en"}
      onValueChange={(value) => {
        if (value === "en" || value === "zh") {
          void i18n.changeLanguage(value);
        }
      }}
    >
      <SelectTrigger
        aria-label={t("languageSwitcher.ariaLabel")}
        className="border-border h-9 w-[min(8.5rem,100%)] shrink-0 rounded-full text-xs font-semibold"
        size="sm"
      >
        <SelectValue>
          {(value: string | null) => {
            if (value === "zh") {
              return t("languageSwitcher.chinese");
            }
            if (value === "en") {
              return t("languageSwitcher.english");
            }
            return "";
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="en">{t("languageSwitcher.english")}</SelectItem>
        <SelectItem value="zh">{t("languageSwitcher.chinese")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
