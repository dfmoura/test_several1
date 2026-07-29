import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@orcamento/pricing-engine"],
  serverExternalPackages: ["pdfkit"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
