export type ExportMetadata = {
  attributionUrl: string;
  qrPayload: string;
};

export function createExportMetadata(shareUrl: string): ExportMetadata {
  return {
    attributionUrl: "https://perlerloom.app",
    qrPayload: shareUrl
  };
}
