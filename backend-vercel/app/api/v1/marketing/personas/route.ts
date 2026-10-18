/**
 * Persona Analysis API
 * GET /api/v1/marketing/personas
 * 
 * Returns persona buckets (ICP segments) with user counts and characteristics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth-utils';

function getSupabase() { return getServiceClient(); }

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const personaLabel = searchParams.get('persona_label');
    const minUsers = parseInt(searchParams.get('min_users') || '0');

    // Get persona buckets with their definitions
    let personaQuery = supabase
      .from('persona_bucket')
      .select('*')
      .order('label');

    if (personaLabel) {
      personaQuery = personaQuery.eq('label', personaLabel);
    }

    const { data: personas, error: personaError } = await personaQuery;

    if (personaError) {
      throw new Error(`Persona query failed: ${personaError.message}`);
    }

    // For each persona, get user count and aggregate data
    const personasWithData = await Promise.all(
      (personas || []).map(async (persona: any) => {
        // Count users in this persona
        const { count, error: countError } = await supabase
          .from('user_persona')
          .select('*', { count: 'exact', head: true })
          .eq('persona_bucket_id', persona.bucket_id)
          .gte('assigned_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        // Get sample users from this persona
        const { data: sampleUsers } = await supabase
          .from('user_persona')
          .select('user_id, confidence, assigned_at')
          .eq('persona_bucket_id', persona.bucket_id)
          .order('confidence', { ascending: false })
          .limit(5);

        return {
          ...persona,
          user_count: count || 0,
          sample_users: sampleUsers || [],
        };
      })
    );

    // Filter by minimum user count if specified
    const filteredPersonas = personasWithData.filter(p => p.user_count >= minUsers);

    // Calculate total users across all personas
    const totalUsers = filteredPersonas.reduce((sum, p) => sum + p.user_count, 0);

    // Add percentage distribution
    const personasWithPercentage = filteredPersonas.map(persona => ({
      ...persona,
      percentage: totalUsers > 0 ? ((persona.user_count / totalUsers) * 100).toFixed(1) : '0.0',
    }));

    return NextResponse.json({
      personas: personasWithPercentage,
      summary: {
        total_personas: personasWithPercentage.length,
        total_users: totalUsers,
        avg_users_per_persona: totalUsers > 0 
          ? Math.round(totalUsers / personasWithPercentage.length) 
          : 0,
      },
      filters: {
        persona_label: personaLabel,
        min_users: minUsers,
      },
    });

  } catch (error) {
    console.error('Personas API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch persona data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
