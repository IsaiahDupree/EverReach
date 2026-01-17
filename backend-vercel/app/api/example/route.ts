/**
 * Example API Route with Analytics Tracking
 * 
 * This demonstrates how to use the analytics middleware
 * to automatically track API requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAnalytics } from '@/lib/middleware/analytics';
import { auth } from '@/lib/analytics';

// Example: Simple GET endpoint with automatic tracking
export const GET = withAnalytics(async (req: NextRequest) => {
  return NextResponse.json({
    message: 'Hello from tracked API',
    timestamp: new Date().toISOString(),
  });
});

// Example: POST endpoint with manual event tracking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Track a custom event
    if (body.userId) {
      await auth.signup(body.userId, 'email', 'free');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Event tracked',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Example: Using screenshot namespace
export async function PUT(req: NextRequest) {
  try {
    const { userId, screenshotId, fileSize, mimeType, width, height } = await req.json();
    
    // Import at function level to avoid circular deps
    const { screenshot } = await import('@/lib/analytics');
    
    await screenshot.uploaded(userId, screenshotId, {
      file_size: fileSize,
      mime_type: mimeType,
      width,
      height,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Screenshot upload tracked',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to track screenshot' },
      { status: 500 }
    );
  }
}
