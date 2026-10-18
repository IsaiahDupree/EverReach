/**
 * Feature Flags API
 * GET /api/admin/feature-flags - List all flags
 * POST /api/admin/feature-flags - Create new flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAdminError } from '@/lib/admin-middleware';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

// List all feature flags
export async function GET(req: NextRequest) {
  return requireRole(req, ['super_admin', 'admin', 'analyst', 'viewer'], async () => {
    const supabase = getSupabase();
    try {
      const searchParams = req.nextUrl.searchParams;
      const environment = searchParams.get('environment') || 'production';
      const enabled = searchParams.get('enabled');

      let query = supabase
        .from('feature_flags')
        .select('*')
        .eq('environment', environment)
        .order('created_at', { ascending: false });

      if (enabled !== null) {
        query = query.eq('is_enabled', enabled === 'true');
      }

      const { data: flags, error } = await query;

      if (error) throw error;

      // Get usage stats for each flag (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: usageStats } = await supabase
        .from('mv_feature_flag_usage')
        .select('*')
        .gte('date', weekAgo.toISOString().split('T')[0]);

      // Merge usage stats with flags
      const flagsWithStats = flags?.map(flag => {
        const stats = usageStats?.filter(s => s.flag_key === flag.key) || [];
        const totalEvaluations = stats.reduce((sum, s) => sum + (s.total_evaluations || 0), 0);
        const totalUsers = stats.reduce((sum, s) => sum + (s.unique_users || 0), 0);
        const avgEnabledPct = stats.reduce((sum, s) => sum + (s.enabled_percentage || 0), 0) / (stats.length || 1);

        return {
          ...flag,
          usage: {
            total_evaluations: totalEvaluations,
            unique_users: totalUsers,
            avg_enabled_percentage: Math.round(avgEnabledPct * 100) / 100,
          },
        };
      });

      return NextResponse.json({ flags: flagsWithStats });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}

// Create new feature flag
export async function POST(req: NextRequest) {
  return requireRole(req, ['super_admin', 'admin'], async () => {
    const supabase = getSupabase();
    try {
      const body = await req.json();

      const {
        key,
        name,
        description,
        rollout_percentage = 0,
        target_user_ids,
        target_segments,
        target_platforms,
        is_enabled = false,
        environment = 'production',
        owner_email,
        tags,
      } = body;

      // Validate required fields
      if (!key || !name) {
        return NextResponse.json(
          { error: 'key and name are required' },
          { status: 400 }
        );
      }

      // Validate rollout percentage
      if (rollout_percentage < 0 || rollout_percentage > 100) {
        return NextResponse.json(
          { error: 'rollout_percentage must be between 0 and 100' },
          { status: 400 }
        );
      }

      // Create flag
      const { data: flag, error } = await supabase
        .from('feature_flags')
        .insert({
          key,
          name,
          description,
          rollout_percentage,
          target_user_ids,
          target_segments,
          target_platforms,
          is_enabled,
          environment,
          owner_email: owner_email || null,
          tags,
          enabled_at: is_enabled ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Feature flag with this key already exists' },
            { status: 409 }
          );
        }
        throw error;
      }

      return NextResponse.json({ flag }, { status: 201 });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}
