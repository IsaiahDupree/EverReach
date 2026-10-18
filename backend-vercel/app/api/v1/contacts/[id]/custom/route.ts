/**
 * Contact Custom Fields API
 * 
 * GET    /v1/contacts/:id/custom
 * PATCH  /v1/contacts/:id/custom
 */

import { options } from "@/lib/cors";
import { getSupabaseServiceClient } from '@/lib/supabase';
import { getServiceClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getCustomFieldDefs, coerceValue, checkUniqueness } from '@/lib/custom-fields/ai-tools';
import { validateAndCoerce, formatValidationErrors } from '@/lib/custom-fields/validator';

// Build-safe: Supabase client created lazily inside request handlers

// ============================================================================
// GET - Get custom field values for a contact
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = params.id;

    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await getServiceClient().auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch contact with custom fields
    const { data: contact, error } = await getSupabaseServiceClient()
      .from('contacts')
      .select('id, org_id, custom, custom_schema_version')
      .eq('id', contactId)
      .single();

    if (error || !contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get field definitions for context
    const defs = await getCustomFieldDefs(contact.org_id, 'contact', { aiReadableOnly: true });

    return Response.json({
      success: true,
      data: {
        contact_id: contact.id,
        custom: contact.custom || {},
        schema_version: contact.custom_schema_version,
        definitions: defs,
      },
    });

  } catch (error) {
    console.error('GET /v1/contacts/:id/custom error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update custom field values for a contact
// ============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = params.id;

    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await getServiceClient().auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const { patch, source = 'api' } = body; // source: 'api' | 'ui' | 'ai_agent'

    if (!patch || typeof patch !== 'object') {
      return Response.json(
        { error: 'Missing or invalid patch object' },
        { status: 400 }
      );
    }

    // Fetch contact
    const { data: contact, error: contactError } = await getSupabaseServiceClient()
      .from('contacts')
      .select('id, org_id, custom')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get field definitions
    const defs = await getCustomFieldDefs(contact.org_id, 'contact');
    const defsBySlug = new Map(defs.map(d => [d.slug, d]));

    // Check for unknown fields
    for (const slug of Object.keys(patch)) {
      if (!defsBySlug.has(slug)) {
        return Response.json(
          { error: `Unknown custom field: ${slug}` },
          { status: 422 }
        );
      }
    }

    // Coerce values to correct types
    const coerced: Record<string, any> = {};
    for (const [slug, rawValue] of Object.entries(patch)) {
      const def = defsBySlug.get(slug)!;
      coerced[slug] = coerceValue(rawValue, def);
    }

    // Validate using Zod
    const validation = await validateAndCoerce(coerced, Array.from(defsBySlug.values()));
    if (!validation.success) {
      return Response.json(
        formatValidationErrors(validation.errors!),
        { status: 422 }
      );
    }

    // Check uniqueness constraints
    for (const [slug, value] of Object.entries(coerced)) {
      const def = defsBySlug.get(slug)!;
      if (def.unique_across_org && value !== null && value !== '') {
        const isUnique = await checkUniqueness(
          contact.org_id,
          'contact',
          contactId,
          slug,
          value
        );

        if (!isUnique) {
          return Response.json(
            {
              error: 'Uniqueness violation',
              details: { [slug]: `Value for ${def.label} must be unique` },
            },
            { status: 409 }
          );
        }
      }
    }

    // Merge into contact.custom using RPC
    const { data: updated, error: updateError } = await getSupabaseServiceClient().rpc(
      'merge_contact_custom',
      {
        p_contact_id: contactId,
        p_org_id: contact.org_id,
        p_patch: coerced,
      }
    );

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 });
    }

    // Log change (optional)
    for (const [slug, newValue] of Object.entries(coerced)) {
      const oldValue = contact.custom?.[slug];
      if (oldValue !== newValue) {
        await getSupabaseServiceClient().from('custom_field_changes').insert({
          org_id: contact.org_id,
          entity_kind: 'contact',
          entity_id: contactId,
          field_slug: slug,
          old_value: oldValue,
          new_value: newValue,
          changed_by: user.id,
          changed_via: source,
        });
      }
    }

    return Response.json({
      success: true,
      data: {
        contact_id: contactId,
        custom: updated,
        updated_fields: Object.keys(coerced),
      },
    });

  } catch (error) {
    console.error('PATCH /v1/contacts/:id/custom error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export function OPTIONS(req: Request) {
  return options(req);
}
