import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware for Authentication
 *
 * This middleware:
 * 1. Protects routes that require authentication
 * 2. Automatically refreshes Supabase sessions
 * 3. Redirects unauthenticated users to login
 * 4. Allows public routes to be accessed without auth
 *
 * Protected routes: /dashboard, /settings, /items
 * Public routes: /, /login, /signup, /pricing, /about
 *
 * How it works:
 * - On every request, it creates a Supabase client with cookie handling
 * - Checks if the user is authenticated via supabase.auth.getUser()
 * - If the route is protected and user is not authenticated, redirects to /login
 * - If authenticated or route is public, proceeds with the request
 * - Automatically refreshes the session by updating cookies
 */

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie on request for immediate availability
          request.cookies.set({
            name,
            value,
            ...options,
          });
          // Set cookie on response for persistence
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Remove cookie from request
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          // Remove cookie from response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get authenticated user
  // This call automatically refreshes the session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define protected route patterns
  const protectedRoutes = [
    '/dashboard',
    '/settings',
    '/items',
  ];

  // Check if current path matches a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If trying to access a protected route without authentication, redirect to login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original URL to redirect back after login
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated or accessing public route, proceed
  return response;
}

/**
 * Middleware Configuration
 *
 * The matcher specifies which routes this middleware should run on.
 * We run it on all routes except:
 * - API routes (/api/*)
 * - Static files (_next/static/*)
 * - Image optimization (_next/image/*)
 * - Favicon and other public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
