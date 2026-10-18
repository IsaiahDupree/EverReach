// This local tRPC API route is deprecated.
// The app now uses the Vercel backend directly via EXPO_PUBLIC_API_URL.
// This file is kept for backward compatibility but should not be used.

const deprecatedHandler = async (request: Request) => {
  console.warn('[tRPC Local Route] This route is deprecated. Use Vercel backend directly.');
  return new Response(
    JSON.stringify({
      error: 'Local tRPC route is deprecated',
      message: 'The app is configured to use the Vercel backend. Ensure EXPO_PUBLIC_API_URL is set correctly.',
      hint: 'tRPC client should make requests directly to the Vercel backend, not through this local route.',
      vercelBackend: process.env.EXPO_PUBLIC_API_URL || 'Not configured'
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
};

const optionsHandler = async (request: Request) => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

export { deprecatedHandler as GET, deprecatedHandler as POST, optionsHandler as OPTIONS };