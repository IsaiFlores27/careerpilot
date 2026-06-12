import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@google/genai", "mammoth", "@react-pdf/renderer"],
};

export default nextConfig;
