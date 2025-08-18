/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
      {
        source: '/files/:path*',
        destination: 'http://localhost:8000/files/:path*',
      },
      {
        source: '/audio/:path*',
        destination: 'http://localhost:8000/audio/:path*',
      },
    ]
  },
}

module.exports = nextConfig
