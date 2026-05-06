export type AppStatusTone = "muted" | "accent";

export type AppStatusMessage = {
  tone: AppStatusTone;
  key: string;
  params?: Record<string, string | number>;
};

/** When `AppStatusMessage.key` equals this value, no status toast is shown. */
export const hiddenStatusStripMessageKey = "status.hidden";
