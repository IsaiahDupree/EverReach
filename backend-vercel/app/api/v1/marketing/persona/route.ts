/**
 * Persona Assignment Endpoint
 * 
 * Assign or update user's persona bucket
 * 
 * POST /api/v1/marketing/persona
 * Body: { user_id, persona_bucket_id, confidence_score, source }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

interface PersonaAssignmentRequest {
  user_id: string;
  persona_bucket_id?: string;
  persona_slug?: string; // Alternative to ID
  confidence_score?: number;
  source?: 'ai_enrichment' | 'manual' | 'behavior_analysis';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: PersonaAssignmentRequest = await req.json();
    const { user_id, persona_bucket_id, persona_slug, confidence_score = 0.5, source = 'manual' } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    let bucketId = persona_bucket_id;

    // If slug provided, lookup bucket_id
    if (persona_slug && !bucketId) {
      const { data: bucket, error } = await supabase
        .from('persona_bucket')
        .select('persona_bucket_id')
        .eq('slug', persona_slug)
        .single();

      if (error || !bucket) {
        return NextResponse.json(
          { error: `Persona bucket not found: ${persona_slug}` },
          { status: 404 }
        );
      }

      bucketId = bucket.persona_bucket_id;
    }

    if (!bucketId) {
      return NextResponse.json(
        { error: 'Must provide either persona_bucket_id or persona_slug' },
        { status: 400 }
      );
    }

    // Upsert persona assignment
    const { data, error } = await supabase
      .from('user_persona')
      .upsert({
        user_id,
        persona_bucket_id: bucketId,
        confidence_score,
        assigned_at: new Date().toISOString(),
        assigned_by: source
      }, {
        onConflict: 'user_id'
      })
      .select('*, persona_bucket(*)')
      .single();

    if (error) {
      console.error('Failed to assign persona:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user_id,
      persona: data
    });

  } catch (error) {
    console.error('Persona assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint - retrieve user's persona
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const userId = req.nextUrl.searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing user_id parameter' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('user_persona')
    .select('*, persona_bucket(*)')
    .eq('user_id', userId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Persona not found for user' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
