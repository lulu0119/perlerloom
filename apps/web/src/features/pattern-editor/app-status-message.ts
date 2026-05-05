export type AppStatusTone = "muted" | "accent";

export type AppStatusMessage = {
  tone: AppStatusTone;
  key: string;
  params?: Record<string, string | number>;
};
