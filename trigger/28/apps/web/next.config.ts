import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@orcamento/pricing-engine",
    "@reta/focus-nfe",
    "@reta/banco-inter",
  ],
  serverExternalPackages: ["pdfkit"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  /** Marca em /brand é asset estático pequeno; evita falha do otimizador local. */
  images: {
    localPatterns: [{ pathname: "/brand/**" }],
  },
};

export default nextConfig;
