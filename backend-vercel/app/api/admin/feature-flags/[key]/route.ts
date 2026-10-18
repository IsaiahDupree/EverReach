/**
 * Feature Flag Detail API
 * GET /api/admin/feature-flags/[key] - Get flag details
 * PATCH /api/admin/feature-flags/[key] - Update flag
 * DELETE /api/admin/feature-flags/[key] - Delete flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAdminError } from '@/lib/admin-middleware';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

interface RouteParams {
  params: {
    key: string;
  };
}

// Get feature flag details
export async function GET(req: NextRequest, { params }: RouteParams) {
  return requireRole(req, ['super_admin', 'admin', 'analyst', 'viewer'], async () => {
    const supabase = getSupabase();
    try {
      const { key } = params;

      // Get flag
      const { data: flag, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !flag) {
        return NextResponse.json(
          { error: 'Feature flag not found' },
          { status: 404 }
        );
      }

      // Get usage stats (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usageStats } = await supabase
        .from('mv_feature_flag_usage')
        .select('*')
        .eq('flag_key', key)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Get recent evaluations
      const { data: recentEvaluations } = await supabase
        .from('feature_flag_evaluations')
        .select('*')
        .eq('flag_key', key)
        .order('evaluated_at', { ascending: false })
        .limit(100);

      return NextResponse.json({
        flag,
        usage: {
          daily_stats: usageStats || [],
          recent_evaluations: recentEvaluations || [],
        },
      });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}

// Update feature flag
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return requireRole(req, ['super_admin', 'admin'], async () => {
    const supabase = getSupabase();
    try {
      const { key } = params;
      const body = await req.json();

      const {
        name,
        description,
        rollout_percentage,
        target_user_ids,
        target_segments,
        target_platforms,
        is_enabled,
        tags,
      } = body;

      // Validate rollout percentage if provided
      if (rollout_percentage !== undefined && (rollout_percentage < 0 || rollout_percentage > 100)) {
        return NextResponse.json(
          { error: 'rollout_percentage must be between 0 and 100' },
          { status: 400 }
        );
      }

      // Get current flag
      const { data: currentFlag } = await supabase
        .from('feature_flags')
        .select('is_enabled')
        .eq('key', key)
        .single();

      if (!currentFlag) {
        return NextResponse.json(
          { error: 'Feature flag not found' },
          { status: 404 }
        );
      }

      // Build update object
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (rollout_percentage !== undefined) updates.rollout_percentage = rollout_percentage;
      if (target_user_ids !== undefined) updates.target_user_ids = target_user_ids;
      if (target_segments !== undefined) updates.target_segments = target_segments;
      if (target_platforms !== undefined) updates.target_platforms = target_platforms;
      if (tags !== undefined) updates.tags = tags;

      // Handle enabled state changes
      if (is_enabled !== undefined) {
        updates.is_enabled = is_enabled;
        
        if (is_enabled && !currentFlag.is_enabled) {
          // Flag being enabled
          updates.enabled_at = new Date().toISOString();
        } else if (!is_enabled && currentFlag.is_enabled) {
          // Flag being disabled
          updates.disabled_at = new Date().toISOString();
        }
      }

      // Update flag
      const { data: flag, error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ flag });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}

// Delete feature flag
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return requireRole(req, ['super_admin'], async () => {
    const supabase = getSupabase();
    try {
      const { key } = params;

      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('key', key);

      if (error) throw error;

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}
