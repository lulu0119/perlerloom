import type { ConversionFailureCode } from "@/workers/conversion-worker";

export class ConversionWorkerFailure extends Error {
  readonly code: ConversionFailureCode;

  constructor(code: ConversionFailureCode) {
    super(code);
    this.name = "ConversionWorkerFailure";
    this.code = code;
  }
}
