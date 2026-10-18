/**
 * Seed Marketing Intelligence Data
 * 
 * Populates required data for marketing intelligence tests
 * 
 * Usage:
 *   node seed-marketing-data.mjs
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n' + '═'.repeat(70));
console.log('🌱 SEEDING MARKETING INTELLIGENCE DATA');
console.log('═'.repeat(70));
console.log('');

let successCount = 0;
let errorCount = 0;

async function seedFunnelStages() {
  console.log('📊 Seeding funnel stages...');
  
  const stages = [
    { stage_name: 'ad_click', ordinal: 1, conversion_threshold: 0.5, description: 'User clicked on advertisement' },
    { stage_name: 'landing_view', ordinal: 2, conversion_threshold: 0.3, description: 'User viewed landing page' },
    { stage_name: 'signup', ordinal: 3, conversion_threshold: 0.2, description: 'User created an account' },
    { stage_name: 'onboarding', ordinal: 4, conversion_threshold: 0.15, description: 'User completed onboarding' },
    { stage_name: 'first_action', ordinal: 5, conversion_threshold: 0.1, description: 'User performed first meaningful action' },
    { stage_name: 'active_user', ordinal: 6, conversion_threshold: 0.05, description: 'User became active (7+ days)' },
    { stage_name: 'paying_customer', ordinal: 7, conversion_threshold: 0.02, description: 'User converted to paying customer' }
  ];

  for (const stage of stages) {
    try {
      const { error } = await supabase
        .from('funnel_stage')
        .upsert(stage, { onConflict: 'stage_name' });
      
      if (error) throw error;
      successCount++;
      console.log(`  ✅ ${stage.stage_name}`);
    } catch (error) {
      errorCount++;
      console.log(`  ⚠️  ${stage.stage_name}: ${error.message}`);
    }
  }
}

async function seedPersonaBuckets() {
  console.log('\n👥 Seeding persona buckets...');
  
  const buckets = [
    { label: 'power_user', description: 'Highly engaged users with frequent activity', priority: 1, criteria: { min_sessions: 10, min_actions: 50 } },
    { label: 'casual_user', description: 'Moderate engagement, regular check-ins', priority: 2, criteria: { min_sessions: 3, max_sessions: 10 } },
    { label: 'dormant_user', description: 'Previously active, now inactive', priority: 3, criteria: { days_inactive: 30 } },
    { label: 'new_user', description: 'Recently signed up, exploring features', priority: 4, criteria: { account_age_days: 7 } },
    { label: 'at_risk', description: 'Declining engagement, potential churn', priority: 5, criteria: { engagement_drop: 0.5 } }
  ];

  for (const bucket of buckets) {
    try {
      const { error } = await supabase
        .from('persona_bucket')
        .upsert(bucket, { onConflict: 'label' });
      
      if (error) throw error;
      successCount++;
      console.log(`  ✅ ${bucket.label}`);
    } catch (error) {
      errorCount++;
      console.log(`  ⚠️  ${bucket.label}: ${error.message}`);
    }
  }
}

async function seedMagnetismScores() {
  console.log('\n⭐ Calculating magnetism scores from user events...');
  
  try {
    // Get users with events
    const { data: events, error: eventsError } = await supabase
      .from('user_event')
      .select('user_id, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (eventsError) throw eventsError;
    
    if (!events || events.length === 0) {
      console.log('  ⚠️  No user events found in last 30 days');
      return;
    }
    
    // Group by user
    const userEvents = {};
    events.forEach(event => {
      if (!userEvents[event.user_id]) {
        userEvents[event.user_id] = [];
      }
      userEvents[event.user_id].push(event);
    });
    
    console.log(`  Found ${Object.keys(userEvents).length} users with events`);
    
    // Calculate and insert scores
    for (const [userId, userEventList] of Object.entries(userEvents)) {
      try {
        const score = Math.min(100, userEventList.length * 5);
        const recentEvents = userEventList.filter(e => 
          new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length;
        
        const uniqueDays = new Set(
          userEventList.map(e => new Date(e.created_at).toDateString())
        ).size;
        
        const { error } = await supabase
          .from('magnetism_score')
          .upsert({
            user_id: userId,
            score,
            signals: {
              total_events: userEventList.length,
              unique_days: uniqueDays,
              recent_activity: recentEvents
            },
            calculated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: 'user_id' });
        
        if (error) throw error;
        successCount++;
        console.log(`  ✅ User ${userId.substring(0, 8)}: score=${score}`);
      } catch (error) {
        errorCount++;
        console.log(`  ⚠️  User ${userId.substring(0, 8)}: ${error.message}`);
      }
    }
  } catch (error) {
    errorCount++;
    console.log(`  ❌ Error: ${error.message}`);
  }
}

async function seedFunnelProgress() {
  console.log('\n🔄 Creating funnel progress records...');
  
  try {
    // Get funnel stages
    const { data: stages, error: stagesError } = await supabase
      .from('funnel_stage')
      .select('stage_id, stage_name');
    
    if (stagesError) throw stagesError;
    if (!stages || stages.length === 0) {
      console.log('  ⚠️  No funnel stages found');
      return;
    }
    
    // Get user events
    const { data: events, error: eventsError } = await supabase
      .from('user_event')
      .select('user_id, event_type, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      console.log('  ⚠️  No user events found');
      return;
    }
    
    console.log(`  Processing ${events.length} events across ${stages.length} stages`);
    
    // Map events to stages
    const stageMapping = {
      'ad_click': ['ad_click', 'utm_tracking'],
      'landing_view': ['page_view', 'landing_view'],
      'signup': ['signup', 'user_created']
    };
    
    const progressRecords = [];
    const seenCombos = new Set();
    
    for (const event of events) {
      for (const stage of stages) {
        const validTypes = stageMapping[stage.stage_name] || [];
        if (validTypes.includes(event.event_type)) {
          const combo = `${event.user_id}-${stage.stage_id}`;
          if (!seenCombos.has(combo)) {
            seenCombos.add(combo);
            progressRecords.push({
              user_id: event.user_id,
              stage_id: stage.stage_id,
              reached_at: event.created_at,
              converted: true
            });
          }
        }
      }
    }
    
    console.log(`  Created ${progressRecords.length} progress records`);
    
    if (progressRecords.length > 0) {
      const { error } = await supabase
        .from('funnel_user_progress')
        .upsert(progressRecords, { onConflict: 'user_id,stage_id' });
      
      if (error) throw error;
      successCount += progressRecords.length;
      console.log(`  ✅ Inserted ${progressRecords.length} funnel progress records`);
    }
  } catch (error) {
    errorCount++;
    console.log(`  ❌ Error: ${error.message}`);
  }
}

async function main() {
  try {
    await seedFunnelStages();
    await seedPersonaBuckets();
    await seedMagnetismScores();
    await seedFunnelProgress();
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('📊 SEED DATA RESULTS');
    console.log('═'.repeat(70));
    console.log(`✅ Operations succeeded: ${successCount}`);
    console.log(`⚠️  Operations failed: ${errorCount}`);
    console.log('');
    
    if (errorCount === 0) {
      console.log('✅ SEEDING COMPLETE!');
      console.log('');
      console.log('Ready to test:');
      console.log('  node test/agent/bucket-1-marketing-intelligence.mjs');
    } else {
      console.log('⚠️  SEEDING COMPLETED WITH ERRORS');
      console.log('');
      console.log('Some operations failed. Review errors above.');
    }
    
    console.log('═'.repeat(70));
    console.log('');
    
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
