import type { NextConfig } from "next";
import { computePublicBasePath } from "./base-path";

const basePath = computePublicBasePath();

const nextConfig: NextConfig = {
  transpilePackages: ["@perlerloom/core", "@perlerloom/palettes", "@perlerloom/ui"],
  output: "export",
  images: {
    unoptimized: true
  },
  ...(basePath !== ""
    ? {
        basePath,
        assetPrefix: basePath
      }
    : {})
};

export default nextConfig;
