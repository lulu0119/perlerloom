import type { PatternDocument, PatternSettings } from "@perlerloom/core";

export type BrowserConversionInput = {
  rgbBytes: ArrayBuffer;
  width: number;
  height: number;
  targetWidth?: number;
  targetHeight?: number;
  settings: PatternSettings;
};

/**
 * Runs palette conversion in the browser.
 *
 * We do not use `new Worker(new URL("./…ts"))` here: Next.js dev (Turbopack) can emit a **raw `.ts`**
 * asset URL for that pattern, which browsers cannot execute as a worker script, so the worker would
 * never respond. A compiled worker pipeline could be reintroduced later; until then this path
 * matches the previous `Worker === undefined` fallback (same thread, dynamic import of handlers).
 */
export async function convertImageInWorker(input: BrowserConversionInput): Promise<PatternDocument> {
  const { handleConversionRequest } = await import("@/workers/conversion-worker");
  const response = handleConversionRequest({
    ...input,
    requestId: crypto.randomUUID()
  });

  if (response.type === "error") {
    throw new Error(response.message);
  }

  return response.pattern;
}
