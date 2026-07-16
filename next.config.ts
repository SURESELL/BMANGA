import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] }
  },
  // pdfkit ships its .afm font metrics as data files loaded at runtime via a
  // relative path from its own package directory. Webpack-bundling it (the
  // default for API routes) leaves those files behind, causing an ENOENT at
  // request time. Marking it external makes Next.js require() it straight
  // from node_modules instead, where the font files are physically present.
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }
    ]
  }
};

export default nextConfig;
