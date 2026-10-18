/**
 * Request Password Reset Endpoint
 * POST /api/admin/auth/request-reset
 */

import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await requestPasswordReset(email);

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Request reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
