import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify authentication from request headers
 * Supports both Authorization header and custom X-User-Id header
 */
export async function verifyAuth(request: NextRequest): Promise<{
  userId: string;
  email?: string;
  authenticated: boolean;
}> {
  // Check for Authorization header (JWT token)
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        throw new Error('Invalid token');
      }
      
      return {
        userId: user.id,
        email: user.email,
        authenticated: true
      };
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }
  
  // Fallback: Check for X-User-Id header (for testing/internal APIs)
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) {
    return {
      userId: userIdHeader,
      authenticated: true
    };
  }
  
  throw new Error('No authentication provided');
}

/**
 * Extract user ID from request without throwing errors
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const auth = await verifyAuth(request);
    return auth.userId;
  } catch {
    return null;
  }
}

/**
 * Verify admin access (service role key)
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return apiKey === serviceKey;
}
