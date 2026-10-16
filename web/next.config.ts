import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML in out/, served by nginx. Server work lives in the Laravel api/.
  output: "export",
  images: { unoptimized: true },
  // @senbud/core ships TypeScript source, not a build.
  transpilePackages: ["@senbud/core"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
