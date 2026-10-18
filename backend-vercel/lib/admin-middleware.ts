/**
 * Admin Authentication Middleware
 * Validates admin session tokens for dashboard API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, extractSessionToken } from './admin-auth';
import type { AdminUser } from './admin-auth';

export interface AdminContext {
  user: AdminUser;
  token: string;
}

/**
 * Middleware to require admin authentication
 */
export async function requireAdmin(
  req: NextRequest,
  handler: (req: NextRequest, context: AdminContext) => Promise<NextResponse>
): Promise<NextResponse> {
  // Extract token
  const token = extractSessionToken(req.headers);

  if (!token) {
    return NextResponse.json(
      { error: 'Missing authorization token' },
      { status: 401 }
    );
  }

  // Verify session
  const user = await verifySession(token);

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  // Call handler with context
  return handler(req, { user, token });
}

/**
 * Middleware to require specific admin role
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: Array<'super_admin' | 'admin' | 'analyst' | 'viewer'>,
  handler: (req: NextRequest, context: AdminContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return requireAdmin(req, async (req, context) => {
    if (!allowedRoles.includes(context.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

/**
 * Helper to handle errors in admin endpoints
 */
export function handleAdminError(error: unknown): NextResponse {
  console.error('[Admin API Error]', error);

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// Alias for backwards compatibility
export { requireAdmin as requireAdminAuth };
