import { withSerwist } from "@serwist/turbopack"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.1.176"],
}

export default withSerwist(nextConfig)
