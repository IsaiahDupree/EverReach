import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/sessions/[id]/modifiers
 *
 * Updates session modifiers and triggers re-score.
 * Body: { shadeFactor, exposureFactor, protectionFactor }
 *
 * Returns: { session, daily }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const sessionId = context.params.id;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shadeFactor, exposureFactor, protectionFactor } = body;

    // Verify user owns this session
    const { data: session, error: sessionError } = await supabase
      .from('sun_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Upsert modifiers with source='manual'
    await supabase.from('session_modifiers').upsert({
      session_id: sessionId,
      shade_factor: shadeFactor ?? session.shade_factor,
      exposure_factor: exposureFactor ?? session.exposure_factor,
      protection_factor: protectionFactor ?? session.protection_factor,
      source: 'manual',
      updated_at: new Date().toISOString(),
    });

    // Trigger re-score by calling the score endpoint
    const scoreResponse = await fetch(
      new URL(`/api/sessions/${sessionId}/score`, request.url),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      }
    );

    const scoreData = await scoreResponse.json();

    return NextResponse.json({
      session: scoreData.session,
      daily: scoreData.daily,
    });
  } catch (error) {
    console.error('[modifiers endpoint]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
