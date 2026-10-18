# ⚡ Electro-Behavior Models — Quick Start Guide

**Ready to implement in 4 steps!**

---

## 🎯 Where Everything Goes

```
backend-vercel/
├── migrations/
│   └── electro-behavior-schema.sql          ✅ CREATED - Run this first
│
├── lib/electro-behavior/                    ✅ CREATED - Python modules ready
│   ├── models/
│   │   └── ssm_jax.py                       ✅ State-space, Kalman, EM
│   ├── decision/
│   │   └── bandits.py                       ✅ Thompson Sampling
│   ├── control/
│   │   └── mpc_cvxpy.py                     ✅ MPC optimization
│   ├── causal/
│   │   └── dr_learner.py                    ✅ Uplift estimation
│   ├── examples/
│   │   ├── quickstart.ts                    ✅ TypeScript example
│   │   ├── quickstart.py                    ✅ Python example
│   │   └── runner.py                        ⏳ TODO: Create
│   └── README.md                            ✅ Module docs
│
├── app/api/v1/electro/                      ⏳ TODO: Create these endpoints
│   ├── events/route.ts                      → POST /v1/electro/events
│   ├── estimate/route.ts                    → POST /v1/electro/estimate
│   ├── simulate/route.ts                    → POST /v1/electro/simulate
│   ├── recommend/route.ts                   → POST /v1/electro/recommend
│   ├── forecast/route.ts                    → POST /v1/electro/forecast
│   ├── jobs/[job_id]/route.ts              → GET /v1/electro/jobs/:id
│   ├── segments/route.ts                    → GET /v1/electro/segments
│   └── usage/route.ts                       → GET /v1/electro/usage
│
├── app/api/webhooks/posthog-events/         ✅ EXISTS - Add mirror logic
│   └── route.ts                             → Add mirrorToElectro()
│
├── app/api/cron/
│   └── process-electro-jobs/                ⏳ TODO: Create cron job
│       └── route.ts                         → Every 5 minutes
│
├── workers/electro/                         ⏳ TODO: Create worker
│   └── process_job.py                       → Python job processor
│
└── openapi/
    └── electro-behavior.yaml                ✅ CREATED - API spec
```

---

## 🚀 4-Step Implementation

### **Step 1: Database Setup** (5 minutes)

```bash
# Run the migration
psql $DATABASE_URL -f backend-vercel/migrations/electro-behavior-schema.sql

# Verify tables created
psql $DATABASE_URL -c "\dt electro_*"
```

**Expected Output**:
```
 electro_events
 electro_model_configs
 electro_estimate_runs
 electro_simulation_runs
 electro_recommendation_runs
 electro_segments
 electro_jobs
```

---

### **Step 2: Create API Endpoints** (30 minutes)

**Quick Win**: Start with events endpoint

```bash
# Create directory
mkdir -p backend-vercel/app/api/v1/electro/events

# Copy template from implementation plan
# File: backend-vercel/app/api/v1/electro/events/route.ts
```

**Test it**:
```bash
curl -X POST http://localhost:3000/api/v1/electro/events \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_test",
    "events": [
      {
        "user_id": "u_1",
        "ts": "2025-10-22T01:00:00Z",
        "name": "app_open",
        "props": {"platform": "ios"}
      }
    ]
  }'
```

**Expected Response**:
```json
{
  "accepted": 1,
  "rejected": 0,
  "errors": []
}
```

---

### **Step 3: Mirror Existing Events** (15 minutes)

**Option A**: Add to PostHog webhook (Recommended)

```typescript
// backend-vercel/app/api/webhooks/posthog-events/route.ts
// ADD after line ~50 (after event processing)

await mirrorToElectro({
  project_id: 'proj_main',
  events: batch.map(event => ({
    user_id: event.distinct_id,
    ts: event.timestamp,
    name: event.event,
    props: event.properties
  }))
});
```

**Option B**: Create database view (No code changes)

```sql
-- Reuse existing user_event table
CREATE VIEW electro_events_view AS
SELECT
  event_id::text as event_id,
  'proj_main' as project_id,
  user_id,
  NULL as anon_id,
  occurred_at as ts,
  event_name as name,
  event_properties as props,
  created_at
FROM user_event;
```

---

### **Step 4: Test Python Modules** (10 minutes)

```bash
# Install dependencies
cd backend-vercel
pip install jax jaxlib numpy cvxpy osqp scikit-learn

# Run example
cd lib/electro-behavior
python examples/quickstart.py  # or runner.py
```

**Expected Output**:
```
🚀 EverReach Electro-Behavior Quickstart

1️⃣ Ingesting events...
   ✓ Accepted: 2 events

2️⃣ Estimating RC retention parameters...
   ✓ R: 2.30
   ✓ C: 14.50
   ✓ RC (time-to-habit): 33.35 days
   ✓ RMSE: 0.0234
   ✓ R²: 0.873

3️⃣ Simulating 28-day horizon...
   ✓ DAU (first 7 days): 5200, 5350, 5480, ...
   ✓ D7 Retention: 24.0%, 26.0%, 28.0%, ...

✅ Quickstart complete!
```

---

## 🎯 Verify Everything Works

### **1. Check Event Ingestion**

```sql
-- Query Supabase
SELECT COUNT(*) FROM electro_events WHERE project_id = 'proj_main';
```

### **2. Check API Health**

```bash
curl http://localhost:3000/api/v1/electro/health
```

### **3. Run Full Example**

```bash
cd backend-vercel/lib/electro-behavior
python examples/quickstart.py
```

---

## 🔧 Common Issues & Fixes

### **Issue 1**: Python modules not found

```bash
# Fix: Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)/lib/electro-behavior"
```

### **Issue 2**: JAX installation fails

```bash
# Use CPU-only JAX
pip install --upgrade "jax[cpu]"
```

### **Issue 3**: Database connection fails

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### **Issue 4**: API returns 404

```bash
# Make sure dev server is running
npm run dev

# Check route exists
ls -la backend-vercel/app/api/v1/electro/
```

---

## 📊 Next Steps After Setup

### **Week 1**: Core Infrastructure
- [x] Database schema
- [x] Python modules
- [ ] API endpoints (events, estimate, simulate)
- [ ] Event mirroring from PostHog
- [ ] Basic testing

### **Week 2**: Async Jobs
- [ ] Job queue system
- [ ] Python worker script
- [ ] Cron job for processing
- [ ] Job status endpoint

### **Week 3**: Advanced Features
- [ ] Recommend endpoint (bandits + MPC)
- [ ] Forecast endpoint
- [ ] Segments CRUD
- [ ] Usage tracking

### **Week 4**: Dashboard
- [ ] Scenario explorer UI
- [ ] Fit diagnostics charts
- [ ] Policy recommendations display
- [ ] Guardrail monitoring

---

## 🎓 Learning Resources

### **Documentation**
- **Product Overview**: `ELECTRO_BEHAVIOR_MODELS.md`
- **Technical Spec**: `ELECTRO_BEHAVIOR_TECHNICAL.md`
- **Implementation Plan**: `ELECTRO_BEHAVIOR_IMPLEMENTATION_PLAN.md`
- **Complete Summary**: `ELECTRO_BEHAVIOR_COMPLETE.md`

### **Code Examples**
- **Python**: `lib/electro-behavior/examples/quickstart.py`
- **TypeScript**: `lib/electro-behavior/examples/quickstart.ts`
- **Module Docs**: `lib/electro-behavior/README.md`

### **API Reference**
- **OpenAPI Spec**: `openapi/electro-behavior.yaml`
- View at: https://redocly.github.io/redoc/

---

## 💡 Pro Tips

1. **Start Small**: Begin with event ingestion only, then add features
2. **Reuse Data**: Use existing `user_event` table via database view
3. **Cache Results**: Store estimate runs to avoid re-computing
4. **Monitor Costs**: Track simulation minutes for billing
5. **Test Locally**: Use synthetic data before production events

---

## 🎉 You're Ready!

**Start with Step 1 (Database Setup) and work through each step.**

Total time to working prototype: **~1 hour**

**Questions?** Check the implementation plan or technical docs!

---

**Quick Command Reference**:

```bash
# Setup
psql $DATABASE_URL -f backend-vercel/migrations/electro-behavior-schema.sql
pip install jax jaxlib numpy cvxpy osqp scikit-learn

# Test
python backend-vercel/lib/electro-behavior/examples/quickstart.py

# Run dev server
npm run dev

# Test API
curl -X POST http://localhost:3000/api/v1/electro/events \
  -H "Content-Type: application/json" \
  -d '{"project_id": "proj_test", "events": [...]}'
```

**Let's ship it!** 🚀
