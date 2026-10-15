import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML in out/, served by nginx. Server work lives in the Laravel api/.
  output: "export",
  images: { unoptimized: true },
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
