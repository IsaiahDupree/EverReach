import 'server-only';

// Standalone tRPC server - should only run on server-side
// This file should not be imported by any client-side code

// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('trpc-server.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';

export async function handleTRPCRequest(request: Request): Promise<Response> {
  console.log('[tRPC Server] Processing request:', request.method, request.url);
  
  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext,
      onError: ({ error, path }: { error: any; path?: string }) => {
        console.error('[tRPC Error]', { path, error: error.message });
      },
    });

    // Ensure proper JSON content type
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error: any) {
    console.error('[tRPC Server] Handler error:', error);
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
}