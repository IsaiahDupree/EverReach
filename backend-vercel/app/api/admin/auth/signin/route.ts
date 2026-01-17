/**
 * Admin Sign In Endpoint
 * POST /api/admin/auth/signin
 */

import { NextRequest, NextResponse } from 'next/server';
import { signIn, getIpAddress, getUserAgent } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req.headers);
    const userAgent = getUserAgent(req.headers);

    const result = await signIn(email, password, ipAddress, userAgent);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: result.user,
      token: result.session?.token,
      expiresAt: result.session?.expires_at,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
