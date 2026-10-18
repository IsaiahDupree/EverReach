# examples/quickstart.py
# 1) pip install requests
# 2) export EVERREACH_API_KEY="sk_live_..."
import os
import requests
import datetime
import time

BASE = 'https://api.everreach.app/v1'
HEADERS = {
    'Authorization': f"Bearer {os.environ['EVERREACH_API_KEY']}",
    'Content-Type': 'application/json'
}

def api_call(method, endpoint, **kwargs):
    """Wrapper with retry on rate limits."""
    url = f'{BASE}{endpoint}'
    kwargs.setdefault('headers', HEADERS)
    kwargs.setdefault('timeout', 8)
    
    response = getattr(requests, method)(url, **kwargs)
    
    if response.status_code == 429:
        retry_after = int(response.headers.get('Retry-After', 5))
        print(f'   ⏳ Rate limited, retrying in {retry_after}s...')
        time.sleep(retry_after)
        response = getattr(requests, method)(url, **kwargs)
    
    response.raise_for_status()
    return response.json()

def main():
    print('🚀 EverReach Electro-Behavior Quickstart\n')

    # 1) Ingest events
    print('1️⃣ Ingesting events...')
    ingest = api_call('post', '/events', json={
        'project_id': 'proj_123',
        'events': [
            {
                'user_id': 'u_9a',
                'ts': datetime.datetime.utcnow().isoformat() + 'Z',
                'name': 'app_open',
                'props': {'platform': 'android', 'latency_ms': 210}
            },
            {
                'user_id': 'u_9a',
                'ts': (datetime.datetime.utcnow() + datetime.timedelta(minutes=5)).isoformat() + 'Z',
                'name': 'purchase',
                'props': {'value': 19.99, 'currency': 'USD'}
            }
        ]
    })
    print(f'   ✓ Accepted: {ingest["accepted"]} events\n')

    # 2) Estimate RC retention params
    print('2️⃣ Estimating RC retention parameters...')
    estimate = api_call('post', '/estimate', json={
        'project_id': 'proj_123',
        'model': 'rc_retention',
        'segments': [{
            'name': 'new_android_global_30',
            'filter': 'platform=android AND days_since_signup<=30'
        }],
        'priors': {
            'R': {'min': 0.1, 'max': 10.0},
            'C': {'min': 0.1, 'max': 60.0}
        }
    })
    params = estimate['segment_params'][0]
    print(f'   ✓ R: {params["R"]:.2f}')
    print(f'   ✓ C: {params["C"]:.2f}')
    print(f'   ✓ RC (time-to-habit): {params["RC"]:.2f} days')
    print(f'   ✓ RMSE: {estimate["fit"]["rmse"]:.4f}')
    print(f'   ✓ R²: {estimate["fit"]["r2"]:.3f}\n')

    # 3) Simulate 28-day horizon
    print('3️⃣ Simulating 28-day horizon...')
    simulate = api_call('post', '/simulate', json={
        'project_id': 'proj_123',
        'model': 'state_space',
        'horizon_days': 28,
        'initial_state': 'auto',
        'inputs': [
            {'day': 0, 'u': {'rollout_pct': 0.2, 'promo_voltage': 0.0}},
            {'day': 7, 'u': {'rollout_pct': 0.5, 'promo_voltage': 0.3}},
            {'day': 14, 'u': {'rollout_pct': 0.7, 'promo_voltage': 0.2}}
        ],
        'constraints': {'max_latency_ms': 250}
    })
    dau = simulate['kpis'].get('daily_active_users', [])[:7]
    retention = simulate['kpis'].get('retention_d7', [])[:7]
    print(f'   ✓ DAU (first 7 days): {", ".join(str(round(v)) for v in dau)}')
    print(f'   ✓ D7 Retention: {", ".join(f"{v*100:.1f}%" for v in retention)}\n')

    # 4) Get policy recommendation
    print('4️⃣ Getting policy recommendation...')
    recommend = api_call('post', '/recommend', json={
        'project_id': 'proj_123',
        'objective': 'maximize_revenue',
        'guards': {
            'retention_d7_min': 0.24,
            'latency_p95_max_ms': 250,
            'budget_weekly_usd': 3000
        },
        'actions': ['price_variant', 'copy_variant', 'rollout_pct', 'promo_voltage'],
        'algo': 'constrained_bandit'
    })
    policy = recommend['policy'][0]
    print(f'   ✓ Recommended action: {policy["action"]}')
    print(f'   ✓ Expected revenue uplift: ${recommend["expected_uplift"].get("revenue", 0):.0f}')
    violations = recommend.get('guardrail_violations', [])
    print(f'   ✓ Guardrail violations: {"None ✓" if not violations else ", ".join(violations)}')
    print(f'   ✓ Expected regret: {recommend.get("expected_regret", 0):.1f}\n')

    # 5) Check usage
    print('5️⃣ Checking usage...')
    usage = api_call('get', '/usage')
    print(f'   ✓ Events this month: {usage["events_month"]:,}')
    print(f'   ✓ Simulation minutes: {usage["sim_minutes_month"]:.1f}')
    print(f'   ✓ Rate limit: {usage["rate_limit_qps"]} QPS\n')

    print('✅ Quickstart complete!')
    print('\n📚 Next steps:')
    print('   - Wire up real event ingestion from PostHog/Amplitude')
    print('   - Set up daily /estimate cron for parameter drift tracking')
    print('   - Build scenario explorer dashboard')
    print('   - Integrate /recommend into feature flag service')

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'❌ Error: {e}')
        exit(1)
