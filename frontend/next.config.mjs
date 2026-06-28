/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from any domain for flexibility
  images: {
    remotePatterns: [],
  },
  // Environment variables available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  },
  // Ensure trailing slash consistency
  trailingSlash: false,
};

export default nextConfig;
