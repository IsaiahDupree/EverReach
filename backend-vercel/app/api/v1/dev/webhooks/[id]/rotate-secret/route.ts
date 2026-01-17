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

// Helper to generate webhook secret
function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

// POST /v1/dev/webhooks/[id]/rotate-secret - Rotate webhook secret
export async function POST(
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

    // Verify webhook belongs to org
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Generate new secret
    const newSecret = generateWebhookSecret();

    // Update webhook with new secret
    const { data: updatedWebhook, error: updateError } = await supabase
      .from('webhooks')
      .update({
        secret: newSecret,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error rotating webhook secret:', updateError);
      return NextResponse.json(
        { error: 'Failed to rotate webhook secret' },
        { status: 500 }
      );
    }

    // Return updated webhook with new secret
    // Note: This is the only time the new secret is returned in plain text
    return NextResponse.json({
      webhook: updatedWebhook,
      new_secret: newSecret,
      message: 'Webhook secret rotated successfully. Save this secret securely - it will not be shown again.',
    });

  } catch (error) {
    console.error('Webhook rotate secret error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
