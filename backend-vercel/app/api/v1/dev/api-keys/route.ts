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

// POST /v1/dev/api-keys - Create new API key
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, key_type, scopes, expires_at, ip_allowlist } = body;

    // Validation
    if (!name || !key_type || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, key_type, scopes' },
        { status: 400 }
      );
    }

    if (!['test', 'live'].includes(key_type)) {
      return NextResponse.json(
        { error: 'key_type must be "test" or "live"' },
        { status: 400 }
      );
    }

    // Generate API key
    const apiKey = generateApiKey(key_type);
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = extractKeyPrefix(apiKey);

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

    // Insert API key
    const { data: apiKeyRecord, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        org_id: profile.org_id,
        name,
        key_type,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes,
        expires_at: expires_at || null,
        ip_allowlist: ip_allowlist || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating API key:', insertError);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // Return the API key (only shown once!)
    return NextResponse.json({
      ...apiKeyRecord,
      api_key: apiKey, // Only returned on creation
    }, { status: 201 });

  } catch (error) {
    console.error('API Keys POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /v1/dev/api-keys - List all API keys for the user's org
export async function GET(req: NextRequest) {
  try {
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

    // Fetch API keys
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      keys: keys || [],
      total: keys?.length || 0,
    });

  } catch (error) {
    console.error('API Keys GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
