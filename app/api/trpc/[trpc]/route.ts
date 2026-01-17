// Set runtime to nodejs for server-side operations
export const runtime = 'nodejs';

// Server-only API route handler for tRPC using App Router
// Uses dynamic imports to prevent server code from being bundled with client

const handler = async (request: Request) => {
  console.log('[tRPC API] Processing request:', request.method, request.url);

  try {
    // Dynamic imports prevent server code from being bundled with client
    const [{ fetchRequestHandler }, { appRouter }, { createContext }] = await Promise.all([
      import('@trpc/server/adapters/fetch'),
      import('@/backend/trpc/app-router'),
      import('@/backend/trpc/server'),
    ]);

    return fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext,
      onError: ({ path, error }) => {
        console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
      },
    });
  } catch (error: any) {
    console.error('[tRPC API] Handler error:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      }), 
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
};

// Export handlers for all HTTP methods that tRPC supports
export { handler as GET, handler as POST, handler as OPTIONS };