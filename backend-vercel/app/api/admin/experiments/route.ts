/**
 * A/B Testing Experiments API
 * GET /api/admin/experiments - List all experiments
 * POST /api/admin/experiments - Create new experiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAdminError } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// List all experiments
export async function GET(req: NextRequest) {
  return requireRole(req, ['super_admin', 'admin', 'analyst', 'viewer'], async () => {
    const supabase = getSupabase();
    try {
      const searchParams = req.nextUrl.searchParams;
      const status = searchParams.get('status');

      let query = supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: experiments, error } = await query;

      if (error) throw error;

      // Get results for each experiment
      const { data: results } = await supabase
        .from('mv_experiment_results')
        .select('*');

      // Merge results with experiments
      const experimentsWithResults = experiments?.map(exp => {
        const expResults = results?.filter(r => r.experiment_key === exp.key) || [];
        
        return {
          ...exp,
          results: expResults,
          total_users: expResults.reduce((sum, r) => sum + (r.total_users || 0), 0),
        };
      });

      return NextResponse.json({ experiments: experimentsWithResults });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}

// Create new experiment
export async function POST(req: NextRequest) {
  return requireRole(req, ['super_admin', 'admin'], async () => {
    const supabase = getSupabase();
    try {
      const body = await req.json();

      const {
        key,
        name,
        description,
        hypothesis,
        control_variant,
        treatment_variants,
        traffic_allocation = 100,
        target_user_ids,
        target_segments,
        target_platforms,
        primary_metric,
        secondary_metrics,
        minimum_sample_size = 1000,
        confidence_level = 0.95,
        minimum_detectable_effect = 0.05,
        owner_email,
        tags,
      } = body;

      // Validate required fields
      if (!key || !name || !control_variant || !treatment_variants || !primary_metric) {
        return NextResponse.json(
          { error: 'key, name, control_variant, treatment_variants, and primary_metric are required' },
          { status: 400 }
        );
      }

      // Validate variant weights sum to 100
      const controlWeight = control_variant.weight || 0;
      const treatmentWeights = treatment_variants.reduce((sum: number, v: any) => sum + (v.weight || 0), 0);
      
      if (controlWeight + treatmentWeights !== 100) {
        return NextResponse.json(
          { error: 'Variant weights must sum to 100' },
          { status: 400 }
        );
      }

      // Create experiment
      const { data: experiment, error } = await supabase
        .from('experiments')
        .insert({
          key,
          name,
          description,
          hypothesis,
          status: 'draft',
          control_variant,
          treatment_variants,
          traffic_allocation,
          target_user_ids,
          target_segments,
          target_platforms,
          primary_metric,
          secondary_metrics,
          minimum_sample_size,
          confidence_level,
          minimum_detectable_effect,
          owner_email: owner_email || null,
          tags,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Experiment with this key already exists' },
            { status: 409 }
          );
        }
        throw error;
      }

      return NextResponse.json({ experiment }, { status: 201 });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}
