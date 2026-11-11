import { withSerwist } from "@serwist/turbopack"

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.1.176"],
  // Que ningún otro sitio pueda incrustar la app en un iframe ni adivinar tipos de archivo.
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }]
  },
}

export default withSerwist(nextConfig)
