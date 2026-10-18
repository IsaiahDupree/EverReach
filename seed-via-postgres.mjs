/**
 * Seed Marketing Data via Direct PostgreSQL Connection
 * 
 * Uses pg library to connect directly to Supabase PostgreSQL database
 * 
 * Usage:
 *   npm install pg
 *   node seed-via-postgres.mjs
 */

import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

const PROJECT_ID = 'utasetfxiqcrnwyfforx';
const DB_PASSWORD = 'everreach123!@#';

const client = new Client({
  host: `db.${PROJECT_ID}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('\n' + '═'.repeat(70));
console.log('🌱 SEEDING VIA DIRECT POSTGRESQL CONNECTION');
console.log('═'.repeat(70));
console.log('');

async function main() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    console.log('');

    console.log('📝 Reading SQL file...');
    const sql = readFileSync('seed-marketing-data.sql', 'utf8');
    console.log(`✅ Loaded ${sql.length} bytes`);
    console.log('');

    console.log('⚙️  Executing SQL...');
    const result = await client.query(sql);
    console.log('✅ SQL executed successfully');
    console.log('');

    if (result.rows && result.rows.length > 0) {
      console.log('📊 Results:');
      result.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${JSON.stringify(row)}`);
      });
      console.log('');
    }

    console.log('═'.repeat(70));
    console.log('✅ SEEDING COMPLETE');
    console.log('═'.repeat(70));
    console.log('');
    console.log('🧪 Run tests:');
    console.log('   node test/agent/bucket-1-marketing-intelligence.mjs');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
