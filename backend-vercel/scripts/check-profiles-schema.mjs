#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const config = {
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.utasetfxiqcrnwyfforx',
  password: 'everreach123!@#',
};

async function checkSchema() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Profiles table columns:');
    console.log('========================\n');
    
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n');
    
    const hasDisplayName = result.rows.some(r => r.column_name === 'display_name');
    const hasPreferences = result.rows.some(r => r.column_name === 'preferences');
    
    console.log('Migration Status:');
    console.log(`  display_name: ${hasDisplayName ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  preferences:  ${hasPreferences ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log('');
    
    if (!hasDisplayName || !hasPreferences) {
      console.log('⚠️  Migration has NOT been applied to production!');
      console.log('\nRun: .\\scripts\\migrate-and-verify.ps1');
    } else {
      console.log('✅ Migration has been applied successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSchema();
