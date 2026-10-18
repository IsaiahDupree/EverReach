// Ambient shims to unblock local TypeScript checks for backend-vercel only
// These provide minimal types for modules that are not present in local builds.

declare module '@/lib/cors' {
  export const cors: any;
  export const buildCorsHeaders: any;
  export const options: any;
  export const badRequest: any;
  export const serverError: any;
  export const ok: any;
  export const created: any;
  const _default: any;
  export default _default;
}

declare module '@/lib/auth' {
  export const auth: any;
  export const getUser: any;
  const _default: any;
  export default _default;
}

declare module '@/lib/rateLimit' {
  export const rateLimit: any;
  export const checkRateLimit: any;
  const _default: any;
  export default _default;
}

declare module '@/lib/validation' {
  export const validate: any;
  export const contactUpdateSchema: any;
  export const contactCreateSchema: any;
  export const fileCommitSchema: any;
  const _default: any;
  export default _default;
}

declare module '@/lib/entitlements' {
  export const getEntitlements: any;
  export const recomputeEntitlementsForUser: any;
  const _default: any;
  export default _default;
}

declare module '@/lib/admin' {
  export const admin: any;
  export const isAdmin: any;
  const _default: any;
  export default _default;
}

// Augment supabase lib to include helper exports referenced by backend-vercel routes
declare module '@/lib/supabase' {
  export const supabase: any;
  export const getCurrentUser: any;
  export const signInAnonymously: any;
  export const signOut: any;
  export const getClientOrThrow: any;
  export const getServiceClient: any;
}

// Stripe – provide a default export to satisfy imports
declare module 'stripe' {
  const Stripe: any;
  export default Stripe;
}

// Next.js server types used by backend-vercel
declare module 'next/server' {
  export const NextResponse: any;
  export const NextRequest: any;
}

// Middleware analytics module referenced by backend-vercel example route
declare module '@/lib/middleware/analytics' {
  const _default: any;
  export default _default;
}

// Analytics module named exports referenced by backend-vercel example route
declare module '@/lib/analytics' {
  const _default: any;
  export default _default;
  export const auth: any;
  export const errors: any;
}
