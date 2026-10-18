import app from '../../../backend/hono';

const handler = async (request: Request) => {
  try {
    console.log('tRPC API called:', request.method, request.url);
    const response = await app.fetch(request);
    console.log('tRPC response status:', response.status);
    return response;
  } catch (error) {
    console.error('tRPC error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Unknown error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
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

export { handler as GET, handler as POST, optionsHandler as OPTIONS };