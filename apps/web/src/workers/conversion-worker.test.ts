import { describe, expect, it } from "vitest";
import { handleConversionRequest } from "./conversion-worker";

describe("conversion worker contract", () => {
  it("returns a pattern document for valid conversion options", () => {
    const rgbBytes = new Uint8Array([0, 0, 0, 255, 255, 255]);
    const response = handleConversionRequest({
      requestId: "test-request",
      rgbBytes: rgbBytes.buffer,
      width: 2,
      height: 1,
      settings: {
        targetColorCount: 2,
        matchingSpace: "rgb",
        clusteringSpace: "rgb",
        downsamplingMode: "nearest",
        ditheringEnabled: false
      }
    });

    expect(response.type).toBe("success");
    if (response.type === "success") {
      expect(response.pattern.cells).toEqual(["H7", "T1"]);
    }
  });

  it("returns a user-displayable error for invalid dimensions", () => {
    const response = handleConversionRequest({
      requestId: "bad-request",
      rgbBytes: new ArrayBuffer(0),
      width: 1,
      height: 1,
      settings: {
        targetColorCount: 2,
        matchingSpace: "rgb",
        clusteringSpace: "rgb",
        downsamplingMode: "nearest",
        ditheringEnabled: false
      }
    });

    expect(response).toMatchObject({
      type: "error",
      requestId: "bad-request"
    });
    if (response.type === "error") {
      expect(response.code).toBe("rgb_buffer_mismatch");
    }
  });
});
