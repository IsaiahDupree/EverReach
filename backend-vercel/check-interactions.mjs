#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkInteractions() {
  console.log('🔍 Checking interactions table...\n');

  // Get total count
  const { count: total, error: totalError } = await supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error getting total:', totalError.message);
    return;
  }

  console.log(`📊 Total interactions: ${total || 0}`);

  // Get count with NULL occurred_at
  const { count: nullCount, error: nullError } = await supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .is('occurred_at', null);

  if (nullError) {
    console.error('❌ Error getting NULL count:', nullError.message);
    return;
  }

  console.log(`❌ NULL occurred_at: ${nullCount || 0}`);
  console.log(`✅ With occurred_at: ${(total || 0) - (nullCount || 0)}\n`);

  if (nullCount && nullCount > 0) {
    console.log('⚠️  Migration needed! Follow these steps:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
    console.log('2. Run the migration SQL');
    console.log(`3. Will update ${nullCount} interactions\n`);
  } else {
    console.log('✅ All interactions have occurred_at values!\n');
    console.log('Migration already complete or no interactions exist.\n');
  }

  // Sample a few interactions
  const { data: sample, error: sampleError } = await supabase
    .from('interactions')
    .select('id, kind, occurred_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!sampleError && sample) {
    console.log('📋 Sample interactions:');
    sample.forEach((row, i) => {
      const occurred = row.occurred_at || 'NULL';
      const created = row.created_at;
      console.log(`   ${i + 1}. ${row.kind.padEnd(10)} occurred: ${occurred.substring(0, 19)} created: ${created.substring(0, 19)}`);
    });
  }

  console.log('\n🔒 Remember to rotate credentials after migration!');
}

checkInteractions();
