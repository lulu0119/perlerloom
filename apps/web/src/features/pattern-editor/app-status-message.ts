export type AppStatusTone = "muted" | "accent";

export type AppStatusMessage = {
  tone: AppStatusTone;
  key: string;
  params?: Record<string, string | number>;
};

/** When `AppStatusMessage.key` equals this value, the editor does not render the status strip. */
export const hiddenStatusStripMessageKey = "status.hidden";
