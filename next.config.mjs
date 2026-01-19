/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled to enable API routes for KO MVP
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // Allow self-signed SSL certs for backend API calls
    NODE_TLS_REJECT_UNAUTHORIZED: '0',
  },
}

export default nextConfig