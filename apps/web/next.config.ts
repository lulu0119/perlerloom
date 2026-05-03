import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@perlerloom/core", "@perlerloom/palettes", "@perlerloom/ui"],
};

export default nextConfig;
