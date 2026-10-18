// Deprecated local health endpoint - now using Vercel backend

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const handler = async (request: Request) => {
  console.log('[Deprecated API] Local health route accessed:', request.method, request.url);
  
  return new Response(
    JSON.stringify({
      error: 'This local health endpoint is deprecated. Please use the Vercel backend instead.',
      message: 'Update your EXPO_PUBLIC_API_URL to point to your Vercel deployment.',
      status: 410
    }),
    { status: 410, headers: jsonHeaders }
  );
};

const optionsHandler = async () => {
  return new Response(null, { status: 200, headers: jsonHeaders });
};

export { handler as GET, optionsHandler as OPTIONS };