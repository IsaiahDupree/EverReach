/**
 * Shared utilities for admin API tests
 */

export async function runTest(test) {
  const startTime = Date.now();
  process.stdout.write(`⏳ ${test.name}... `);

  try {
    const result = await test.run();
    const duration = Date.now() - startTime;
    
    console.log(`✅ (${duration}ms)`);
    
    if (result && Object.keys(result).length > 0) {
      console.log(`   ${JSON.stringify(result)}`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ (${duration}ms)`);
    throw error;
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
