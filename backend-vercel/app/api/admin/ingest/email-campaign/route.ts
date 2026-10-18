/**
 * Email Campaign Ingestion API
 * POST /api/admin/ingest/email-campaign
 * 
 * Purpose: Manually create/update email campaign data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAdminError } from '@/lib/admin-middleware';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

export async function POST(req: NextRequest) {
  return requireRole(req, ['super_admin', 'admin'], async () => {
    const supabase = getSupabase();
    try {
      const body = await req.json();

        const {
        campaign_id,
        name,
        subject,
        preview_text,
        from_email,
        from_name,
        campaign_type = 'newsletter',
        segment_name,
        template_id,
        scheduled_at,
        sent_at,
        status = 'sent',
        is_ab_test = false,
        ab_variant,
        metrics,
        owner_email,
      } = body;

      // Validate required fields
      if (!campaign_id || !name) {
        return NextResponse.json(
          { error: 'campaign_id and name are required' },
          { status: 400 }
        );
      }

      // Upsert campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .upsert({
          campaign_id,
          name,
          subject,
          preview_text,
          from_email,
          from_name,
          campaign_type,
          segment_name,
          template_id,
          scheduled_at,
          sent_at: sent_at || new Date().toISOString(),
          status,
          is_ab_test,
          ab_variant,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'campaign_id',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // If metrics provided, upsert them
      if (metrics) {
        const {
          sent_count = 0,
          delivered_count = 0,
          bounce_count = 0,
          hard_bounce_count = 0,
          soft_bounce_count = 0,
          open_count = 0,
          unique_open_count = 0,
          click_count = 0,
          unique_click_count = 0,
          unsubscribe_count = 0,
          spam_complaint_count = 0,
          revenue = 0,
        } = metrics;

        // Calculate rates
        const delivery_rate = sent_count > 0 ? (delivered_count / sent_count * 100) : 0;
        const open_rate = delivered_count > 0 ? (unique_open_count / delivered_count * 100) : 0;
        const click_rate = delivered_count > 0 ? (unique_click_count / delivered_count * 100) : 0;
        const click_to_open_rate = unique_open_count > 0 ? (unique_click_count / unique_open_count * 100) : 0;
        const unsubscribe_rate = delivered_count > 0 ? (unsubscribe_count / delivered_count * 100) : 0;
        const revenue_per_email = sent_count > 0 ? (revenue / sent_count) : 0;

        const today = new Date().toISOString().split('T')[0];

        const { error: metricsError } = await supabase
          .from('email_campaign_metrics')
          .upsert({
            campaign_id,
            date: today,
            sent_count,
            delivered_count,
            bounce_count,
            hard_bounce_count,
            soft_bounce_count,
            open_count,
            unique_open_count,
            click_count,
            unique_click_count,
            unsubscribe_count,
            spam_complaint_count,
            delivery_rate: Math.round(delivery_rate * 100) / 100,
            open_rate: Math.round(open_rate * 100) / 100,
            click_rate: Math.round(click_rate * 100) / 100,
            click_to_open_rate: Math.round(click_to_open_rate * 100) / 100,
            unsubscribe_rate: Math.round(unsubscribe_rate * 100) / 100,
            revenue,
            revenue_per_email: Math.round(revenue_per_email * 100) / 100,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'campaign_id,date',
          });

        if (metricsError) throw metricsError;
      }

      return NextResponse.json({
        success: true,
        campaign,
      }, { status: 201 });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}
