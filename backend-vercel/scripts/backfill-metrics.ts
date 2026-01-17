/**
 * 90-Day Metrics Backfill Script
 * 
 * Backfills historical data from existing sources into metrics_timeseries
 * 
 * Sources:
 * - Stripe subscriptions → MRR historical data
 * - RevenueCat events → Trial/conversion history
 * - Email sends → Resend delivery metrics
 * - Webhook logs → Service health history
 * 
 * Usage:
 *   npx tsx scripts/backfill-metrics.ts [--days=90] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Parse command line args
const args = process.argv.slice(2);
const daysToBackfill = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '90');
const isDryRun = args.includes('--dry-run');

console.log(`\n🔄 Starting 90-day backfill (${daysToBackfill} days)...`);
console.log(`   Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE (will write to database)'}\n`);

interface MetricToInsert {
  metric_name: string;
  value: number;
  ts: string;
  labels: Record<string, any>;
}

const metricsToInsert: MetricToInsert[] = [];

async function logMetric(metric_name: string, value: number, ts: Date, labels: Record<string, any> = {}) {
  metricsToInsert.push({
    metric_name,
    value,
    ts: ts.toISOString(),
    labels
  });
}

// =============================================
// 1. Backfill Stripe MRR from subscription history
// =============================================
async function backfillStripeMRR() {
  console.log('📊 Backfilling Stripe MRR...');
  
  // Query profiles with subscription data
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_price_id, subscription_status, current_period_end, created_at')
    .not('stripe_subscription_id', 'is', null);

  if (error) throw error;

  console.log(`   Found ${profiles?.length || 0} subscriptions`);

  // For each day in the last 90 days, calculate MRR snapshot
  for (let i = 0; i < daysToBackfill; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    let dailyMRR = 0;
    let activeSubscriptions = 0;

    for (const profile of profiles || []) {
      // Check if subscription was active on this date
      const createdAt = new Date(profile.created_at);
      const periodEnd = profile.current_period_end ? new Date(profile.current_period_end) : null;

      const wasActive = createdAt <= date && 
                       (periodEnd === null || periodEnd >= date) &&
                       profile.subscription_status === 'active';

      if (wasActive) {
        // Estimate MRR based on price (would need to fetch actual price in production)
        // Assuming $9.99/month for now
        dailyMRR += 9.99;
        activeSubscriptions++;
      }
    }

    if (dailyMRR > 0) {
      await logMetric('stripe.mrr_usd', dailyMRR, date);
      await logMetric('stripe.active_subscriptions', activeSubscriptions, date);
    }
  }

  console.log(`   ✅ Backfilled ${daysToBackfill} days of MRR data\n`);
}

// =============================================
// 2. Backfill RevenueCat trial metrics from webhook logs
// =============================================
async function backfillRevenueCatTrials() {
  console.log('📊 Backfilling RevenueCat trials...');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToBackfill);

  const { data: webhooks, error } = await supabase
    .from('webhook_log')
    .select('processed_at, payload')
    .eq('provider', 'revenuecat')
    .gte('processed_at', startDate.toISOString())
    .order('processed_at', { ascending: true });

  if (error) throw error;

  console.log(`   Found ${webhooks?.length || 0} RevenueCat webhook events`);

  const dailyCounts: Record<string, { trials: number, conversions: number, churns: number }> = {};

  for (const webhook of webhooks || []) {
    const date = new Date(webhook.processed_at).toISOString().split('T')[0];
    const eventType = webhook.payload?.type || webhook.payload?.event_type;

    if (!dailyCounts[date]) {
      dailyCounts[date] = { trials: 0, conversions: 0, churns: 0 };
    }

    if (eventType === 'INITIAL_PURCHASE' || eventType === 'trial_started') {
      dailyCounts[date].trials++;
    } else if (eventType === 'RENEWAL' || eventType === 'trial_converted') {
      dailyCounts[date].conversions++;
    } else if (eventType === 'CANCELLATION' || eventType === 'EXPIRATION') {
      dailyCounts[date].churns++;
    }
  }

  for (const [dateStr, counts] of Object.entries(dailyCounts)) {
    const date = new Date(dateStr);
    await logMetric('revenuecat.trial_started', counts.trials, date);
    await logMetric('revenuecat.trial_converted', counts.conversions, date);
    await logMetric('revenuecat.churned', counts.churns, date);
  }

  console.log(`   ✅ Backfilled ${Object.keys(dailyCounts).length} days of trial data\n`);
}

// =============================================
// 3. Backfill Resend email metrics from email_send table
// =============================================
async function backfillResendEmails() {
  console.log('📊 Backfilling Resend email metrics...');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToBackfill);

  // Assuming you have an email_send table
  const { data: emails, error } = await supabase
    .from('email_send')
    .select('sent_at, delivered_at, opened_at, clicked_at, delivery_status')
    .gte('sent_at', startDate.toISOString())
    .order('sent_at', { ascending: true });

  if (error) {
    console.log('   ⚠️  No email_send table found, skipping\n');
    return;
  }

  console.log(`   Found ${emails?.length || 0} email records`);

  const dailyCounts: Record<string, { sent: number, delivered: number, opened: number, clicked: number }> = {};

  for (const email of emails || []) {
    const sentDate = new Date(email.sent_at).toISOString().split('T')[0];
    
    if (!dailyCounts[sentDate]) {
      dailyCounts[sentDate] = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
    }

    dailyCounts[sentDate].sent++;
    if (email.delivery_status === 'delivered') dailyCounts[sentDate].delivered++;
    if (email.opened_at) dailyCounts[sentDate].opened++;
    if (email.clicked_at) dailyCounts[sentDate].clicked++;
  }

  for (const [dateStr, counts] of Object.entries(dailyCounts)) {
    const date = new Date(dateStr);
    await logMetric('resend.sent', counts.sent, date);
    await logMetric('resend.delivered', counts.delivered, date);
    await logMetric('resend.opened', counts.opened, date);
    await logMetric('resend.clicked', counts.clicked, date);
  }

  console.log(`   ✅ Backfilled ${Object.keys(dailyCounts).length} days of email data\n`);
}

// =============================================
// 4. Backfill service health from webhook_log
// =============================================
async function backfillServiceHealth() {
  console.log('📊 Backfilling service health...');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToBackfill);

  const { data: webhooks, error } = await supabase
    .from('webhook_log')
    .select('processed_at, provider, status')
    .gte('processed_at', startDate.toISOString())
    .order('processed_at', { ascending: true });

  if (error) throw error;

  console.log(`   Found ${webhooks?.length || 0} webhook events`);

  // Count successful vs failed webhooks per day per provider
  const dailyHealth: Record<string, Record<string, { success: number, failed: number }>> = {};

  for (const webhook of webhooks || []) {
    const date = new Date(webhook.processed_at).toISOString().split('T')[0];
    const provider = webhook.provider || 'unknown';

    if (!dailyHealth[date]) dailyHealth[date] = {};
    if (!dailyHealth[date][provider]) {
      dailyHealth[date][provider] = { success: 0, failed: 0 };
    }

    if (webhook.status === 'success') {
      dailyHealth[date][provider].success++;
    } else {
      dailyHealth[date][provider].failed++;
    }
  }

  for (const [dateStr, providers] of Object.entries(dailyHealth)) {
    const date = new Date(dateStr);
    for (const [provider, counts] of Object.entries(providers)) {
      const successRate = (counts.success / (counts.success + counts.failed)) * 100;
      await logMetric('service.webhook_success_rate', successRate, date, { provider });
      await logMetric('service.webhook_count', counts.success + counts.failed, date, { provider });
    }
  }

  console.log(`   ✅ Backfilled service health for ${Object.keys(dailyHealth).length} days\n`);
}

// =============================================
// Main execution
// =============================================
async function main() {
  try {
    await backfillStripeMRR();
    await backfillRevenueCatTrials();
    await backfillResendEmails();
    await backfillServiceHealth();

    console.log(`\n📝 Summary:`);
    console.log(`   Total metrics to insert: ${metricsToInsert.length}`);
    console.log(`   Date range: ${daysToBackfill} days`);

    if (isDryRun) {
      console.log('\n🔍 DRY RUN - No data written to database');
      console.log('\n   Sample metrics:');
      console.log(JSON.stringify(metricsToInsert.slice(0, 5), null, 2));
    } else {
      console.log('\n💾 Writing to database...');
      
      // Batch insert (Supabase limit is 1000 rows per insert)
      const batchSize = 1000;
      for (let i = 0; i < metricsToInsert.length; i += batchSize) {
        const batch = metricsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('metrics_timeseries')
          .insert(batch);

        if (error) {
          console.error(`   ❌ Error inserting batch ${i / batchSize + 1}:`, error);
        } else {
          console.log(`   ✅ Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
        }
      }

      console.log('\n✅ Backfill complete!');
    }

  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

main();
