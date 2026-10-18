// examples/quickstart.ts
// 1) Install: npm i axios
// 2) Set: export EVERREACH_API_KEY="sk_live_..."
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.everreach.app/v1',
  timeout: 8000,
  headers: { 
    Authorization: `Bearer ${process.env.EVERREACH_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Add simple retry on rate limits
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

async function main() {
  console.log('🚀 EverReach Electro-Behavior Quickstart\n');

  // 1) Ingest events
  console.log('1️⃣ Ingesting events...');
  const ingestResponse = await api.post('/events', {
    project_id: 'proj_123',
    events: [
      { 
        user_id: 'u_1', 
        ts: new Date().toISOString(), 
        name: 'app_open', 
        props: { platform: 'ios', latency_ms: 180 } 
      },
      { 
        user_id: 'u_1', 
        ts: new Date(Date.now() + 5 * 60 * 1000).toISOString(), 
        name: 'purchase', 
        props: { value: 24.0, currency: 'USD' } 
      }
    ]
  });
  console.log('   ✓ Accepted:', ingestResponse.data.accepted, 'events\n');

  // 2) Estimate RC retention params for a segment
  console.log('2️⃣ Estimating RC retention parameters...');
  const estimateResponse = await api.post('/estimate', {
    project_id: 'proj_123',
    model: 'rc_retention',
    segments: [{ 
      name: 'new_ios_us_last30', 
      filter: 'platform=ios AND country=US AND days_since_signup<=30' 
    }],
    priors: { 
      R: { min: 0.1, max: 10.0 }, 
      C: { min: 0.1, max: 60.0 } 
    }
  });
  const params = estimateResponse.data.segment_params[0];
  console.log('   ✓ R:', params.R?.toFixed(2));
  console.log('   ✓ C:', params.C?.toFixed(2));
  console.log('   ✓ RC (time-to-habit):', params.RC?.toFixed(2), 'days');
  console.log('   ✓ RMSE:', estimateResponse.data.fit.rmse.toFixed(4));
  console.log('   ✓ R²:', estimateResponse.data.fit.r2.toFixed(3), '\n');

  // 3) Run a simulation over 28 days
  console.log('3️⃣ Simulating 28-day horizon...');
  const simulateResponse = await api.post('/simulate', {
    project_id: 'proj_123',
    model: 'state_space',
    horizon_days: 28,
    initial_state: 'auto',
    inputs: [
      { day: 0, u: { rollout_pct: 0.2, promo_voltage: 0.0 } },
      { day: 7, u: { rollout_pct: 0.5, promo_voltage: 0.3 } },
      { day: 14, u: { rollout_pct: 0.7, promo_voltage: 0.2 } }
    ],
    constraints: { max_latency_ms: 250 }
  });
  const dau = simulateResponse.data.kpis.daily_active_users?.slice(0, 7) || [];
  const retention = simulateResponse.data.kpis.retention_d7?.slice(0, 7) || [];
  console.log('   ✓ DAU (first 7 days):', dau.map((v: any) => Math.round(v)).join(', '));
  console.log('   ✓ D7 Retention:', retention.map((v: any) => (v * 100).toFixed(1) + '%').join(', '), '\n');

  // 4) Get an action recommendation
  console.log('4️⃣ Getting policy recommendation...');
  const recommendResponse = await api.post('/recommend', {
    project_id: 'proj_123',
    objective: 'maximize_revenue',
    guards: { 
      retention_d7_min: 0.24, 
      latency_p95_max_ms: 250, 
      budget_weekly_usd: 3000 
    },
    actions: ['price_variant', 'copy_variant', 'rollout_pct', 'promo_voltage'],
    algo: 'constrained_bandit'
  });
  const policy = recommendResponse.data.policy[0];
  console.log('   ✓ Recommended action:', JSON.stringify(policy.action, null, 2));
  console.log('   ✓ Expected revenue uplift: $', recommendResponse.data.expected_uplift.revenue?.toFixed(0));
  console.log('   ✓ Guardrail violations:', recommendResponse.data.guardrail_violations.length === 0 ? 'None ✓' : recommendResponse.data.guardrail_violations.join(', '));
  console.log('   ✓ Expected regret:', recommendResponse.data.expected_regret?.toFixed(1), '\n');

  // 5) Check usage
  console.log('5️⃣ Checking usage...');
  const usageResponse = await api.get('/usage');
  console.log('   ✓ Events this month:', usageResponse.data.events_month.toLocaleString());
  console.log('   ✓ Simulation minutes:', usageResponse.data.sim_minutes_month.toFixed(1));
  console.log('   ✓ Rate limit:', usageResponse.data.rate_limit_qps, 'QPS\n');

  console.log('✅ Quickstart complete!');
  console.log('\n📚 Next steps:');
  console.log('   - Wire up real event ingestion from PostHog/Amplitude');
  console.log('   - Set up daily /estimate cron for parameter drift tracking');
  console.log('   - Build scenario explorer dashboard');
  console.log('   - Integrate /recommend into feature flag service');
}

main().catch(error => {
  console.error('❌ Error:', error.response?.data || error.message);
  process.exit(1);
});
