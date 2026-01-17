import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to get user from auth token
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user;
}

// POST /v1/automation-rules/[id]/test - Test/dry-run automation rule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { contact_id } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Fetch automation rule with org check
    const { data: rule, error: ruleError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (ruleError || !rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    // Fetch test contact (use provided or first available)
    let contact = null;
    if (contact_id) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact_id)
        .eq('org_id', profile.org_id)
        .single();
      contact = data;
    } else {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('org_id', profile.org_id)
        .limit(1)
        .single();
      contact = data;
    }

    if (!contact) {
      return NextResponse.json(
        { error: 'No contacts found for testing. Create a contact first.' },
        { status: 404 }
      );
    }

    // Evaluate conditions against contact
    const evaluation = evaluateConditions(rule.type, rule.conditions, contact);

    // Build action plan (what would execute)
    const actionPlan = buildActionPlan(rule.actions, contact, rule);

    // Calculate affected contacts if segment_id is specified
    let affectedCount = 1;
    if (rule.segment_id) {
      const { data: segment } = await supabase
        .from('segments')
        .select('member_count')
        .eq('id', rule.segment_id)
        .single();
      affectedCount = segment?.member_count || 0;
    } else {
      // Count contacts that would match this rule
      affectedCount = await countMatchingContacts(supabase, profile.org_id, rule);
    }

    return NextResponse.json({
      rule: {
        id: rule.id,
        name: rule.name,
        type: rule.type,
        enabled: rule.enabled,
      },
      test_contact: {
        id: contact.id,
        name: contact.name,
        warmth_score: contact.warmth_score,
        warmth_band: contact.warmth_band,
        last_touch_days_ago: contact.last_touch_days_ago,
        tags: contact.tags,
      },
      evaluation: {
        would_trigger: evaluation.matches,
        reason: evaluation.reason,
        conditions_met: evaluation.conditions_met,
        conditions_failed: evaluation.conditions_failed,
      },
      action_plan: actionPlan,
      estimated_affected_contacts: affectedCount,
      test_mode: true,
      message: evaluation.matches 
        ? `Rule would trigger for this contact. Estimated ${affectedCount} contacts would be affected.`
        : `Rule would NOT trigger for this contact. Reason: ${evaluation.reason}`,
    });

  } catch (error) {
    console.error('Automation rule test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to evaluate conditions
function evaluateConditions(type: string, conditions: any, contact: any) {
  const conditionsMet: string[] = [];
  const conditionsFailed: string[] = [];
  let matches = false;
  let reason = '';

  switch (type) {
    case 'warmth_threshold':
      const threshold = conditions.warmth_threshold;
      if (contact.warmth_score < threshold) {
        matches = true;
        conditionsMet.push(`Warmth score ${contact.warmth_score} < ${threshold}`);
      } else {
        reason = `Warmth score ${contact.warmth_score} is not below threshold ${threshold}`;
        conditionsFailed.push(reason);
      }
      break;

    case 'no_touch_days':
      const noTouchDays = conditions.no_touch_days;
      if (contact.last_touch_days_ago >= noTouchDays) {
        matches = true;
        conditionsMet.push(`No touch for ${contact.last_touch_days_ago} days >= ${noTouchDays}`);
      } else {
        reason = `Last touch ${contact.last_touch_days_ago} days ago is not >= ${noTouchDays}`;
        conditionsFailed.push(reason);
      }
      break;

    case 'tag_added':
      const requiredTags = conditions.tags || [];
      const hasTag = requiredTags.some((tag: string) => contact.tags?.includes(tag));
      if (hasTag) {
        matches = true;
        conditionsMet.push(`Has required tags: ${requiredTags.join(', ')}`);
      } else {
        reason = `Missing required tags: ${requiredTags.join(', ')}`;
        conditionsFailed.push(reason);
      }
      break;

    case 'stage_change':
      const targetStageId = conditions.stage_id;
      if (contact.stage_id === targetStageId) {
        matches = true;
        conditionsMet.push(`Contact is in target stage: ${targetStageId}`);
      } else {
        reason = `Contact stage ${contact.stage_id} does not match target ${targetStageId}`;
        conditionsFailed.push(reason);
      }
      break;

    default:
      reason = 'Unknown rule type';
      conditionsFailed.push(reason);
  }

  return {
    matches,
    reason,
    conditions_met: conditionsMet,
    conditions_failed: conditionsFailed,
  };
}

// Helper to build action plan
function buildActionPlan(actions: any, contact: any, rule: any) {
  const plan: any[] = [];

  if (actions.webhook) {
    plan.push({
      type: 'webhook',
      description: 'Send webhook event',
      event_type: `automation.${rule.type}.triggered`,
      payload_preview: {
        contact_id: contact.id,
        rule_id: rule.id,
        trigger: rule.type,
      },
    });
  }

  if (actions.email) {
    plan.push({
      type: 'email',
      description: 'Send email notification',
      recipient: actions.email.to || 'team@example.com',
      subject: actions.email.subject || `Automation triggered: ${rule.name}`,
    });
  }

  if (actions.push) {
    plan.push({
      type: 'push_notification',
      description: 'Send push notification',
      title: actions.push.title || `Automation: ${rule.name}`,
      body: actions.push.body || `Rule triggered for ${contact.name}`,
    });
  }

  if (actions.send_message) {
    plan.push({
      type: 'send_message',
      description: 'Queue message to outbox',
      channel: actions.send_message.channel || 'email',
      template_id: actions.send_message.template_id,
      requires_approval: actions.send_message.requires_approval !== false,
    });
  }

  return plan;
}

// Helper to count matching contacts
async function countMatchingContacts(supabase: any, orgId: string, rule: any) {
  let query = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Apply conditions based on rule type
  if (rule.type === 'warmth_threshold') {
    query = query.lt('warmth_score', rule.conditions.warmth_threshold);
  }

  if (rule.type === 'no_touch_days') {
    query = query.gte('last_touch_days_ago', rule.conditions.no_touch_days);
  }

  const { count } = await query;
  return count || 0;
}
