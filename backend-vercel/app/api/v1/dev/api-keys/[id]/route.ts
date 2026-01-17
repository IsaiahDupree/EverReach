import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to get user from auth token
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user;
}

// Helper to generate API key
function generateApiKey(keyType: 'test' | 'live'): string {
  const randomBytes = crypto.randomBytes(32);
  const keyData = randomBytes.toString('hex');
  const prefix = keyType === 'test' ? 'evr_test_' : 'evr_live_';
  return prefix + keyData;
}

// Helper to hash API key
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Helper to extract key prefix for display
function extractKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + '...';
}

// GET /v1/dev/api-keys/[id] - Get single API key
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Fetch API key with org check
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(apiKey);

  } catch (error) {
    console.error('API Key GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /v1/dev/api-keys/[id] - Update/rotate/revoke API key
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, revocation_reason } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Fetch existing API key
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError || !existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'rotate') {
      // Generate new API key
      const newApiKey = generateApiKey(existingKey.key_type);
      const newKeyHash = hashApiKey(newApiKey);
      const newKeyPrefix = extractKeyPrefix(newApiKey);

      // Update with new key
      const { data: updatedKey, error: updateError } = await supabase
        .from('api_keys')
        .update({
          key_hash: newKeyHash,
          key_prefix: newKeyPrefix,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', profile.org_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error rotating API key:', updateError);
        return NextResponse.json(
          { error: 'Failed to rotate API key' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ...updatedKey,
        api_key: newApiKey, // Only returned on rotation
      });

    } else if (action === 'revoke') {
      // Revoke the key
      const { data: revokedKey, error: revokeError } = await supabase
        .from('api_keys')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revocation_reason: revocation_reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', profile.org_id)
        .select()
        .single();

      if (revokeError) {
        console.error('Error revoking API key:', revokeError);
        return NextResponse.json(
          { error: 'Failed to revoke API key' },
          { status: 500 }
        );
      }

      return NextResponse.json(revokedKey);

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "rotate" or "revoke"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('API Key PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /v1/dev/api-keys/[id] - Delete API key
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Delete API key
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Key DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
