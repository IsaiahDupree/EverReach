/**
 * Custom Fields Management API
 * 
 * GET    /v1/custom-fields?entity=contact
 * POST   /v1/custom-fields
 */

import { options, ok, created, badRequest, unauthorized, notFound, serverError } from "@/lib/cors";
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';

// Build-safe: Supabase client created lazily inside request handlers

// ============================================================================
// GET - List custom field definitions
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return unauthorized('Authorization required', req);
    }

    // Get current user
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return unauthorized('Authorization required', req);
    }

    // Get org_id from query or user's default org
    const searchParams = req.nextUrl.searchParams;
    const entityKind = searchParams.get('entity') || 'contact';
    const includeArchived = searchParams.get('include_archived') === 'true';

    // Get user's org_id from user metadata or contacts
    let orgId: string | null = null;

    // Try to get org from user metadata first
    const userMeta = user.user_metadata?.org_id;
    if (userMeta) {
      orgId = userMeta;
    } else {
      // Fallback to finding org from user's contacts
      const { data: userOrg } = await getSupabaseServiceClient()
        .from('contacts')
        .select('org_id')
        .eq('created_by', user.id)
        .limit(1)
        .maybeSingle();
      
      orgId = userOrg?.org_id || null;
    }

    // If no org found, return empty array (user might not have set up yet)
    if (!orgId) {
      return ok({
        success: true,
        data: [],
        count: 0,
      }, req);
    }

    // Fetch custom field definitions
    let query = getSupabaseServiceClient()
      .from('custom_field_defs')
      .select('*')
      .eq('org_id', orgId)
      .eq('entity_kind', entityKind);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data: fields, error } = await query.order('order_index');

    if (error) {
      console.error('Custom fields query error:', error);
      // If table doesn't exist yet, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return ok({
          success: true,
          data: [],
          count: 0,
        }, req);
      }
      return badRequest(error.message, req);
    }

    return ok({
      success: true,
      data: fields || [],
      count: fields?.length || 0,
    }, req);

  } catch (error) {
    console.error('GET /v1/custom-fields error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return serverError(`Internal server error: ${errorMessage}`, req);
  }
}

// ============================================================================
// POST - Create custom field definition
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return unauthorized('Authorization required', req);
    }

    // Get current user
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return unauthorized('Authorization required', req);
    }

    // Parse body
    const body = await req.json();
    const {
      org_id,
      entity_kind,
      slug,
      label,
      type,
      options,
      min_value,
      max_value,
      pattern,
      required = false,
      unique_across_org = false,
      default_value,
      help_text,
      placeholder,
      group_name,
      order_index = 1000,
      icon,
      ai_can_read = true,
      ai_can_write = false,
      synonyms,
      explanation,
      example_values,
      pii_level = 'none',
      is_indexed = false,
      is_searchable = false,
      visibility,
    } = body;

    // Validate required fields
    if (!org_id || !entity_kind || !slug || !label || !type) {
      return badRequest('Missing required fields: org_id, entity_kind, slug, label, type', req);
    }

    // Validate slug format (lowercase, underscores, alphanumeric)
    if (!/^[a-z0-9_]+$/.test(slug)) {
      return badRequest('Slug must be lowercase alphanumeric with underscores only', req);
    }

    // Insert custom field definition
    const { data: field, error } = await getSupabaseServiceClient()
      .from('custom_field_defs')
      .insert({
        org_id,
        entity_kind,
        slug,
        label,
        type,
        options,
        min_value,
        max_value,
        pattern,
        required,
        unique_across_org,
        default_value,
        help_text,
        placeholder,
        group_name,
        order_index,
        icon,
        ai_can_read,
        ai_can_write,
        synonyms,
        explanation,
        example_values,
        pii_level,
        is_indexed,
        is_searchable,
        visibility,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return badRequest(`Field with slug '${slug}' already exists for this entity`, req);
      }
      return badRequest(error.message, req);
    }

    // If is_indexed = true, create the index
    if (is_indexed && entity_kind === 'contact') {
      await getSupabaseServiceClient().rpc('ensure_contact_cf_index', { p_slug: slug });
    }

    return created({
      success: true,
      data: field,
    }, req);

  } catch (error) {
    console.error('POST /v1/custom-fields error:', error);
    return serverError('Internal server error', req);
  }
}

export function OPTIONS(req: Request) {
  return options(req);
}
