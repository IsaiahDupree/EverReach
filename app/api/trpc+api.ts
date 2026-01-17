import 'server-only';

// Local tRPC route is deprecated. Use the external Vercel backend instead.
// Set EXPO_PUBLIC_API_URL (or NEXT_PUBLIC_API_URL) to your deployed backend base URL.

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const handler = async (request: Request) => {
  console.warn('[API Deprecated] Local tRPC route hit:', request.method, request.url);
  return new Response(
    JSON.stringify({
      status: 'gone',
      message: 'Local tRPC routes have been removed. Point the app to your Vercel backend via EXPO_PUBLIC_API_URL.',
    }),
    { status: 410, headers: jsonHeaders }
  );
};

const optionsHandler = async (request: Request) => {
  return new Response(null, { status: 200, headers: jsonHeaders });
};

export { handler as GET, handler as POST, optionsHandler as OPTIONS };
