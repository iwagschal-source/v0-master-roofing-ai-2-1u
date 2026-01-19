/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled to enable API routes for KO MVP
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig