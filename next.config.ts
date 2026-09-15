import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright"],
  experimental: {
    serverActions: {
      // Default is 1MB. Raised to comfortably fit a CSV job-import upload
      // (itself capped at 5MB — see MAX_FILE_BYTES in import-export.ts) plus
      // multipart/form-data overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
