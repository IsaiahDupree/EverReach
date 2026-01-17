/**
 * Admin Sign Out Endpoint
 * POST /api/admin/auth/signout
 */

import { NextRequest, NextResponse } from 'next/server';
import { signOut, extractSessionToken } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const token = extractSessionToken(req.headers);

    if (!token) {
      return NextResponse.json(
        { error: 'No session token provided' },
        { status: 401 }
      );
    }

    const success = await signOut(token);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
