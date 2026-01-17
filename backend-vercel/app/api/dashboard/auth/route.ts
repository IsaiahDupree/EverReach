import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Check password against environment variable
    const correctPassword = process.env.DASHBOARD_PASSWORD || 'dashboard123';

    if (password !== correctPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const secret = new TextEncoder().encode(
      process.env.DASHBOARD_JWT_SECRET || 'your-secret-key-change-in-production'
    );

    const token = await new SignJWT({ dashboard: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
