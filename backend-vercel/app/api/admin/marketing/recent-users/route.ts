/**
 * Recent Users with Marketing Data (Admin Dashboard)
 * 
 * GET /api/admin/marketing/recent-users?limit=50
 * 
 * Returns recent users with enrichment, persona, and magnetism data
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/admin-middleware';

function getSupabase() { return getServiceClient(); }

export async function GET(req: NextRequest) {
  return requireAdminAuth(req, async (req, context) => {
    try {
      const supabase = getSupabase();
      const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

    // Fetch recent user identities with enrichment data
    const { data: identities, error: identitiesError } = await supabase
      .from('user_identity')
      .select(`
        user_id,
        email_hash,
        status,
        enriched_at,
        created_at,
        cost_cents,
        company_name,
        company_industry,
        social_profiles
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (identitiesError) {
      console.error('Failed to fetch user identities:', identitiesError);
      return NextResponse.json(
        { error: 'Database query failed', details: identitiesError.message },
        { status: 500 }
      );
    }

    if (!identities || identities.length === 0) {
      return NextResponse.json({
        users: [],
        total: 0
      });
    }

    const userIds = identities.map(i => i.user_id);

    // Fetch personas in parallel
    const { data: personas } = await supabase
      .from('user_persona')
      .select(`
        user_id,
        confidence_score,
        assigned_at,
        persona_bucket (
          slug,
          label
        )
      `)
      .in('user_id', userIds);

    // Fetch latest magnetism scores (7d)
    const { data: magnetism } = await supabase
      .from('user_magnetism_index')
      .select('user_id, index_value, computed_at')
      .in('user_id', userIds)
      .eq('window', '7d')
      .order('computed_at', { ascending: false });

    // Create lookup maps
    const personaMap = new Map(personas?.map(p => [p.user_id, p]) || []);
    const magnetismMap = new Map();
    
    // Get most recent magnetism per user
    magnetism?.forEach(m => {
      if (!magnetismMap.has(m.user_id)) {
        magnetismMap.set(m.user_id, m);
      }
    });

    // Combine data
    const users = identities.map(identity => {
      const persona = personaMap.get(identity.user_id);
      const mag = magnetismMap.get(identity.user_id);

      return {
        user_id: identity.user_id,
        email_hash: identity.email_hash,
        enrichment: {
          status: identity.status,
          enriched_at: identity.enriched_at,
          created_at: identity.created_at,
          cost_usd: identity.cost_cents ? identity.cost_cents / 100 : null,
          company: identity.company_name,
          industry: identity.company_industry,
          social_platforms: identity.social_profiles 
            ? Object.keys(identity.social_profiles).length 
            : 0
        },
        persona: persona ? {
          slug: (persona.persona_bucket as any)?.slug,
          label: (persona.persona_bucket as any)?.label,
          confidence: persona.confidence_score,
          assigned_at: persona.assigned_at
        } : null,
        magnetism: mag ? {
          score: mag.index_value,
          band: getMagnetismBand(mag.index_value),
          computed_at: mag.computed_at
        } : null
      };
    });

    return NextResponse.json({
      users,
      total: users.length,
      generated_at: new Date().toISOString()
    });

    } catch (error) {
      console.error('Recent users error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: String(error) },
        { status: 500 }
      );
    }
  });
}

function getMagnetismBand(score: number): string {
  if (score >= 70) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 30) return 'cooling';
  return 'cold';
}
