/**
 * Experiment Detail API
 * GET /api/admin/experiments/[key] - Get experiment details and results
 * PATCH /api/admin/experiments/[key] - Update experiment
 * DELETE /api/admin/experiments/[key] - Delete experiment
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

// Get experiment details
export async function GET(req: NextRequest, { params }: RouteParams) {
  return requireRole(req, ['super_admin', 'admin', 'analyst', 'viewer'], async () => {
    const supabase = getSupabase();
    try {
      const { key } = params;

      // Get experiment
      const { data: experiment, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !experiment) {
        return NextResponse.json(
          { error: 'Experiment not found' },
          { status: 404 }
        );
      }

      // Get variant results
      const { data: results } = await supabase
        .from('mv_experiment_results')
        .select('*')
        .eq('experiment_key', key);

      // Get assignments
      const { data: assignments } = await supabase
        .from('experiment_assignments')
        .select('variant_key, platform, assigned_at')
        .eq('experiment_key', key)
        .order('assigned_at', { ascending: false })
        .limit(100);

      // Get metric events
      const { data: metricEvents } = await supabase
        .from('experiment_metric_events')
        .select('*')
        .eq('experiment_key', key)
        .order('occurred_at', { ascending: false })
        .limit(100);

      return NextResponse.json({
        experiment,
        results: results || [],
        recent_assignments: assignments || [],
        recent_metric_events: metricEvents || [],
      });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}

// Update experiment
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return requireRole(req, ['super_admin', 'admin'], async (req, context) => {
    try {
      const { key } = params;
      const body = await req.json();

      const {
        name,
        description,
        hypothesis,
        status,
        traffic_allocation,
        target_user_ids,
        target_segments,
        target_platforms,
        winning_variant,
        statistical_significance,
        results,
      } = body;

      // Get current experiment
      const { data: currentExp } = await getSupabase()
        .from('experiments')
        .select('status')
        .eq('key', key)
        .single();

      if (!currentExp) {
        return NextResponse.json(
          { error: 'Experiment not found' },
          { status: 404 }
        );
      }

      // Build update object
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (hypothesis !== undefined) updates.hypothesis = hypothesis;
      if (traffic_allocation !== undefined) updates.traffic_allocation = traffic_allocation;
      if (target_user_ids !== undefined) updates.target_user_ids = target_user_ids;
      if (target_segments !== undefined) updates.target_segments = target_segments;
      if (target_platforms !== undefined) updates.target_platforms = target_platforms;
      if (winning_variant !== undefined) updates.winning_variant = winning_variant;
      if (statistical_significance !== undefined) updates.statistical_significance = statistical_significance;
      if (results !== undefined) updates.results = results;

      // Handle status changes
      if (status !== undefined) {
        updates.status = status;
        
        if (status === 'running' && currentExp.status === 'draft') {
          updates.started_at = new Date().toISOString();
        } else if (status === 'completed' && currentExp.status === 'running') {
          updates.ended_at = new Date().toISOString();
        }
      }

      // Update experiment
      const { data: experiment, error } = await getSupabase()
        .from('experiments')
        .update(updates)
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ experiment });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}

// Delete experiment
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return requireRole(req, ['super_admin'], async () => {
    const supabase = getSupabase();
    try {
      const { key } = params;

      // Archive instead of delete (safer)
      const { error } = await supabase
        .from('experiments')
        .update({ status: 'archived' })
        .eq('key', key);

      if (error) throw error;

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}
