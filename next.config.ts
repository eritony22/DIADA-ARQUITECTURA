import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Uploaded media is served from Vercel Blob's public storage domain
    // (a per-project subdomain of blob.vercel-storage.com) rather than
    // from /public/uploads, so next/image needs it allow-listed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
