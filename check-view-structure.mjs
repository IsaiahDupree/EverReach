import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.utasetfxiqcrnwyfforx.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'everreach123!@#',
  database: 'postgres'
});

async function checkViewStructure() {
  await client.connect();
  
  console.log('🔍 Checking mv_daily_funnel structure\n');
  
  // Check if view exists
  const viewCheck = await client.query(`
    SELECT * FROM information_schema.views 
    WHERE table_name = 'mv_daily_funnel'
  `);
  
  console.log('View exists:', viewCheck.rows.length > 0);
  
  // Get column info
  const columns = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'mv_daily_funnel'
    ORDER BY ordinal_position
  `);
  
  console.log('\nColumns:');
  columns.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`);
  });
  
  // Try to select
  try {
    const data = await client.query('SELECT * FROM mv_daily_funnel LIMIT 1');
    console.log('\n✅ Can query view, rows:', data.rows.length);
  } catch (error) {
    console.error('\n❌ Error querying view:', error.message);
  }
  
  await client.end();
}

checkViewStructure().catch(console.error);
