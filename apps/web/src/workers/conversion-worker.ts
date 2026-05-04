import { convertImageToPattern, type PatternDocument, type PatternSettings } from "@perlerloom/core";
import { mardPalette, type RgbColor } from "@perlerloom/palettes";

export type ConversionWorkerRequest = {
  requestId: string;
  width: number;
  height: number;
  targetWidth?: number;
  targetHeight?: number;
  settings: PatternSettings;
  rgbBytes: ArrayBuffer;
};

export type ConversionWorkerResponse =
  | {
      type: "success";
      requestId: string;
      pattern: PatternDocument;
    }
  | {
      type: "error";
      requestId: string;
      message: string;
    };

export function handleConversionRequest(request: ConversionWorkerRequest): ConversionWorkerResponse {
  try {
    const rgbView = new Uint8Array(request.rgbBytes);
    if (rgbView.length !== request.width * request.height * 3) {
      throw new Error("RGB buffer size does not match image dimensions.");
    }

    const pixels: RgbColor[] = new Array(request.width * request.height);
    let writeIndex = 0;
    for (let index = 0; index < rgbView.length; index += 3) {
      pixels[writeIndex] = {
        red: rgbView[index],
        green: rgbView[index + 1],
        blue: rgbView[index + 2]
      };
      writeIndex += 1;
    }

    const pattern = convertImageToPattern({
      pixels,
      width: request.width,
      height: request.height,
      targetWidth: request.targetWidth,
      targetHeight: request.targetHeight,
      palette: mardPalette,
      settings: request.settings
    });
    return {
      type: "success",
      requestId: request.requestId,
      pattern
    };
  } catch (error) {
    return {
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "Pattern conversion failed."
    };
  }
}
