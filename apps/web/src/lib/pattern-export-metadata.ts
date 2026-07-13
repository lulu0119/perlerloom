export type ExportMetadata = {
  attributionUrl: string;
  qrPayload: string;
};

export function createExportMetadata(shareUrl: string): ExportMetadata {
  return {
    attributionUrl: "https://lulu0119.github.io/douloom",
    qrPayload: shareUrl
  };
}
