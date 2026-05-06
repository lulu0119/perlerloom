import type { TFunction } from "i18next";
import { toast } from "sonner";

import { hiddenStatusStripMessageKey, type AppStatusMessage } from "./app-status-message";

export const patternConvertToastId = "app-pattern-convert";

const patternConvertTerminalKeys = new Set<string>([
  "status.patternGenerated",
  "errors.conversionRgbBufferMismatch",
  "errors.conversionFailed",
  "errors.readImageCanvasUnavailable",
  "status.imageConversionFailed"
]);

export function showAppStatusToast(translate: TFunction, message: AppStatusMessage): void {
  if (message.key === hiddenStatusStripMessageKey) {
    return;
  }
  const text = translate(message.key, message.params as Record<string, unknown>);
  if (message.key === "status.converting") {
    toast.loading(text, { id: patternConvertToastId });
    return;
  }
  if (patternConvertTerminalKeys.has(message.key)) {
    if (message.tone === "accent") {
      toast.error(text, { id: patternConvertToastId });
    } else {
      toast.success(text, { id: patternConvertToastId });
    }
    return;
  }
  if (message.tone === "accent") {
    toast.error(text);
    return;
  }
  toast(text);
}
