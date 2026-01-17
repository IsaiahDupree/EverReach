import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/etl/mobile-acquisition
 * Daily ETL job to pull Apple Search Ads + Google Play acquisition metrics
 * 
 * Fetches:
 * - Installs by source (ASA, Google Play organic, Google Play paid)
 * - Spend and CPI (Cost Per Install)
 * - Trial rate (% who start trial after install)
 * 
 * Joins with RevenueCat trial_started events to compute trial conversion rate
 * 
 * Should be called daily via cron
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const APPLE_SEARCH_ADS_KEY_ID = process.env.APPLE_SEARCH_ADS_KEY_ID;
    const APPLE_SEARCH_ADS_TEAM_ID = process.env.APPLE_SEARCH_ADS_TEAM_ID;
    const GOOGLE_PLAY_SERVICE_ACCOUNT = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    });

    const results: Record<string, any> = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Helper to log metrics
    async function logMetric(metric_name: string, value: number, labels: Record<string, any> = {}) {
      const { error } = await supabase.from('metrics_timeseries').insert({
        metric_name,
        value,
        ts: yesterday.toISOString(),
        labels: {
          ...labels,
          date: yesterdayStr
        }
      });
      if (error) throw error;
    }

    // Update service status
    async function updateServiceStatus(
      service: string,
      status: 'healthy' | 'degraded' | 'down',
      latency_ms: number,
      message?: string
    ) {
      await supabase.from('service_status').upsert({
        service,
        status,
        latency_ms,
        last_check: now.toISOString(),
        last_success: status === 'healthy' ? now.toISOString() : undefined,
        last_failure: status !== 'healthy' ? now.toISOString() : undefined,
        message,
        updated_at: now.toISOString()
      }, { onConflict: 'service' });
    }

    const startTime = Date.now();

    // =============================================
    // 1. Apple Search Ads
    // =============================================
    if (APPLE_SEARCH_ADS_KEY_ID && APPLE_SEARCH_ADS_TEAM_ID) {
      try {
        // In production:
        // - Generate JWT using Apple private key
        // - Call Search Ads API: https://api.searchads.apple.com/api/v4/reports/campaigns
        // - Parse response and extract metrics
        
        // Mock data
        const asaCampaigns = [
          {
            campaign_id: 'asa_123',
            campaign_name: 'Brand Keywords',
            installs: 245,
            spend: 892.50,
            impressions: 125400,
            taps: 3210
          },
          {
            campaign_id: 'asa_456',
            campaign_name: 'Competitor Keywords',
            installs: 178,
            spend: 1205.80,
            impressions: 98300,
            taps: 2140
          }
        ];

        let totalAsaInstalls = 0;
        let totalAsaSpend = 0;

        for (const campaign of asaCampaigns) {
          const cpi = campaign.spend / campaign.installs;
          
          totalAsaInstalls += campaign.installs;
          totalAsaSpend += campaign.spend;

          await logMetric('asa.installs', campaign.installs, {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            platform: 'ios'
          });

          await logMetric('asa.spend_usd', campaign.spend, {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            platform: 'ios'
          });

          await logMetric('asa.cpi_usd', cpi, {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            platform: 'ios'
          });

          await logMetric('asa.impressions', campaign.impressions, {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            platform: 'ios'
          });

          await logMetric('asa.taps', campaign.taps, {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            platform: 'ios'
          });
        }

        // Aggregate ASA metrics
        await logMetric('asa.total_installs', totalAsaInstalls, { platform: 'ios' });
        await logMetric('asa.total_spend_usd', totalAsaSpend, { platform: 'ios' });
        await logMetric('asa.avg_cpi_usd', totalAsaSpend / totalAsaInstalls, { platform: 'ios' });

        results.asa = {
          campaigns: asaCampaigns.length,
          total_installs: totalAsaInstalls,
          total_spend: totalAsaSpend
        };

        await updateServiceStatus('apple_search_ads', 'healthy', Date.now() - startTime, 'ETL completed');

      } catch (error: any) {
        await updateServiceStatus('apple_search_ads', 'degraded', Date.now() - startTime, error.message);
        results.asa = { error: error.message };
      }
    }

    // =============================================
    // 2. Google Play Console
    // =============================================
    if (GOOGLE_PLAY_SERVICE_ACCOUNT) {
      try {
        // In production:
        // - Authenticate with Google Play Developer API
        // - Fetch stats: https://developers.google.com/android-publisher/api-ref/rest/v3/stats
        // - Get install sources and organic vs paid breakdown
        
        // Mock data
        const playStats = {
          organic_installs: 1240,
          paid_installs: 320,
          total_installs: 1560,
          paid_spend: 456.30, // From Google Ads campaigns
          countries: {
            US: 680,
            GB: 240,
            CA: 180,
            AU: 150
          }
        };

        await logMetric('play.organic_installs', playStats.organic_installs, { 
          platform: 'android',
          source: 'organic'
        });

        await logMetric('play.paid_installs', playStats.paid_installs, { 
          platform: 'android',
          source: 'paid'
        });

        await logMetric('play.total_installs', playStats.total_installs, { 
          platform: 'android'
        });

        if (playStats.paid_installs > 0) {
          const cpi = playStats.paid_spend / playStats.paid_installs;
          await logMetric('play.paid_spend_usd', playStats.paid_spend, { 
            platform: 'android',
            source: 'paid'
          });
          await logMetric('play.cpi_usd', cpi, { 
            platform: 'android',
            source: 'paid'
          });
        }

        // Log by country
        for (const [country, installs] of Object.entries(playStats.countries)) {
          await logMetric('play.installs_by_country', installs, {
            platform: 'android',
            country
          });
        }

        results.play = {
          organic_installs: playStats.organic_installs,
          paid_installs: playStats.paid_installs,
          total_installs: playStats.total_installs
        };

        await updateServiceStatus('google_play', 'healthy', Date.now() - startTime, 'ETL completed');

      } catch (error: any) {
        await updateServiceStatus('google_play', 'degraded', Date.now() - startTime, error.message);
        results.play = { error: error.message };
      }
    }

    // =============================================
    // 3. Trial Rate Calculation
    // Join installs with trial_started events from RevenueCat
    // =============================================
    try {
      // Get total installs from yesterday
      const totalInstalls = (results.asa?.total_installs || 0) + (results.play?.total_installs || 0);

      if (totalInstalls > 0) {
        // Count trial_started events from yesterday
        const { data: trialEvents, error } = await supabase
          .from('metrics_timeseries')
          .select('value')
          .eq('metric_name', 'revenuecat.trial_started')
          .gte('ts', yesterday.toISOString())
          .lt('ts', now.toISOString());

        if (error) throw error;

        const totalTrialsStarted = trialEvents?.reduce((sum, e) => sum + Number(e.value), 0) || 0;
        const trialRate = (totalTrialsStarted / totalInstalls) * 100;

        await logMetric('acquisition.install_to_trial_rate', trialRate, {
          total_installs: totalInstalls,
          total_trials: totalTrialsStarted
        });

        results.trial_rate = {
          installs: totalInstalls,
          trials: totalTrialsStarted,
          rate: trialRate.toFixed(2) + '%'
        };
      }
    } catch (error: any) {
      console.error('[trial-rate] Error:', error);
      results.trial_rate = { error: error.message };
    }

    return NextResponse.json({
      success: true,
      date: yesterdayStr,
      results,
      message: 'Mobile acquisition ETL completed. Note: Using mock data - integrate real Apple/Google APIs in production'
    });

  } catch (error: any) {
    console.error('[mobile-acquisition-etl] Error:', error);
    return NextResponse.json({
      error: 'ETL failed',
      details: error.message
    }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'mobile-acquisition-etl',
    description: 'Daily ETL job for Apple Search Ads + Google Play metrics',
    schedule: 'Call via cron daily at 02:00 UTC',
    timestamp: new Date().toISOString()
  });
}

/**
 * Production Implementation Guide:
 * 
 * Apple Search Ads:
 * 1. Create private key in App Store Connect
 * 2. Generate JWT for authentication
 * 3. API endpoint: POST https://api.searchads.apple.com/api/v4/reports/campaigns
 * 4. Request body:
 *    {
 *      "startTime": "2024-01-01",
 *      "endTime": "2024-01-01",
 *      "granularity": "DAILY",
 *      "selector": {
 *        "orderBy": [{"field": "localSpend", "sortOrder": "DESCENDING"}],
 *        "pagination": {"offset": 0, "limit": 1000}
 *      },
 *      "returnRowTotals": true,
 *      "returnRecordsWithNoMetrics": false
 *    }
 * 
 * Google Play Console:
 * 1. Enable Google Play Developer API
 * 2. Create service account and download JSON key
 * 3. API endpoint: GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/subscriptions
 * 4. Use Google Auth Library for Node.js
 * 5. Stats API for install attribution
 * 
 * Trial Rate Join:
 * - Store install events with user_id/device_id
 * - Match trial_started events by user_id within 7-day window
 * - Calculate cohort-based conversion rates
 */
