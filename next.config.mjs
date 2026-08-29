/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Default is 1MB, which a phone camera photo blows past before our
      // own sharp compression in addMenuItem ever gets to run — the raw
      // upload was being rejected outright, surfacing as a 500 on the
      // admin's "Add item" form.
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
