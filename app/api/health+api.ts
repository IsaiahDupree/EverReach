// Health check endpoint for Vercel backend
// This endpoint provides basic health status for the API

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-vercel-protection-bypass',
};

const handler = async (request: Request) => {
  console.log('[Health API] Health check requested:', request.method, request.url);
  
  try {
    // Basic health check response
    const healthData = {
      status: 'healthy',
      message: 'API is running successfully',
      time: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    };

    console.log('[Health API] Returning health data:', healthData);
    
    return new Response(
      JSON.stringify(healthData),
      { 
        status: 200, 
        headers: jsonHeaders 
      }
    );
  } catch (error) {
    console.error('[Health API] Error during health check:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error),
        time: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: jsonHeaders 
      }
    );
  }
};

const optionsHandler = async () => {
  console.log('[Health API] CORS preflight request');
  return new Response(null, { status: 200, headers: jsonHeaders });
};

export { handler as GET, optionsHandler as OPTIONS };