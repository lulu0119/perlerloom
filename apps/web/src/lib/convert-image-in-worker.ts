import type { PatternDocument, PatternSettings } from "@perlerloom/core";
import { handleConversionRequest } from "@/workers/conversion-worker";

export type BrowserConversionInput = {
  rgbBytes: ArrayBuffer;
  width: number;
  height: number;
  targetWidth?: number;
  targetHeight?: number;
  settings: PatternSettings;
};

export async function convertImageInWorker(input: BrowserConversionInput): Promise<PatternDocument> {
  if (typeof Worker === "undefined") {
    return convertInCurrentThread(input);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/conversion-worker.ts", import.meta.url), { type: "module" });

    worker.addEventListener("message", (event) => {
      worker.terminate();
      const response = event.data;
      if (response.type === "success") {
        resolve(response.pattern);
        return;
      }
      reject(new Error(response.message));
    });

    worker.addEventListener("messageerror", () => {
      worker.terminate();
      reject(new Error("Pattern conversion worker message failed."));
    });

    worker.addEventListener("error", () => {
      worker.terminate();
      reject(new Error("Pattern conversion worker failed."));
    });

    const transferableRgbBytes = input.rgbBytes.slice(0);
    worker.postMessage({ ...input, rgbBytes: transferableRgbBytes, requestId: crypto.randomUUID() }, [transferableRgbBytes]);
  });
}

function convertInCurrentThread(input: BrowserConversionInput): PatternDocument {
  const response = handleConversionRequest({
    ...input,
    requestId: "current-thread"
  });

  if (response.type === "error") {
    throw new Error(response.message);
  }

  return response.pattern;
}
