import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable image optimization for Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Ensure proper server-side rendering for Supabase auth
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Allow larger payloads for image uploads
    },
  },
};

export default nextConfig;
