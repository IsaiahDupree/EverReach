/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for optimal serverless performance
  experimental: {
    // Runtime configuration for edge/serverless
    runtime: 'nodejs',
  },

  // CORS and security headers
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            // In production, replace with your actual domain(s)
            // Example: value: process.env.ALLOWED_ORIGIN || 'https://yourdomain.com'
            value: process.env.ALLOWED_ORIGIN || '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },

  // Webpack configuration for optimal bundling
  webpack: (config, { isServer }) => {
    // Server-side optimizations
    if (isServer) {
      // Externalize dependencies that don't need bundling
      config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate'];
    }

    return config;
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Production optimizations
  compress: true,

  // API routes configuration
  // No special output needed - defaults work for Vercel serverless
};

module.exports = nextConfig;
