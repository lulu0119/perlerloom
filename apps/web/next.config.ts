import type { NextConfig } from "next";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath = rawBasePath === "" ? "" : rawBasePath.startsWith("/") ? rawBasePath : `/${rawBasePath}`;

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
