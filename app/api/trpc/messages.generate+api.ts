// Deprecated local tRPC route - now using Vercel backend
const handler = async (request: Request) => {
  console.log('[Deprecated API] Local messages.generate route accessed:', request.method, request.url);
  
  return new Response(
    JSON.stringify({
      error: 'This local API route is deprecated. Please use the Vercel backend instead.',
      message: 'Update your EXPO_PUBLIC_API_URL to point to your Vercel deployment.',
      status: 410
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

export { handler as GET, handler as POST, handler as OPTIONS };