// Deprecated local Hono server - now using Vercel backend
// This stub prevents accidental local server usage

const createDeprecatedResponse = () => {
  return new Response(
    JSON.stringify({
      error: 'Local Hono server is deprecated. Please use the Vercel backend instead.',
      message: 'Update your EXPO_PUBLIC_API_URL to point to your Vercel deployment.',
      status: 410
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};

// Stub export to maintain compatibility
export default {
  fetch: () => createDeprecatedResponse(),
  get: () => createDeprecatedResponse(),
  post: () => createDeprecatedResponse(),
  use: () => {},
};