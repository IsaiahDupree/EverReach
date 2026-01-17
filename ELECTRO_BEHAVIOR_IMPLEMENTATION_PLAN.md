# Electro-Behavior Models — Implementation Plan for EverReach

**Date**: October 22, 2025, 2:30 AM  
**Status**: Implementation Roadmap  
**Target**: Integrate into existing `backend-vercel` infrastructure

---

## 🎯 Where to Implement

### **TL;DR Architecture**

```
Existing Infrastructure → Electro-Behavior Integration
├── backend-vercel/
│   ├── app/api/v1/electro/          ← NEW: API endpoints
│   ├── lib/electro-behavior/        ← ALREADY CREATED: Python modules
│   ├── workers/electro/             ← NEW: Async job workers
│   └── migrations/                  ← NEW: Database schema
├── Supabase (existing)              ← Store events, runs, params
├── PostHog (existing)               ← Event source (via webhook)
└── Vercel (existing)                ← Deploy API + background functions
```

---

## 📁 Detailed File Structure

### **1. Database Schema** (Supabase)

**Location**: `backend-vercel/migrations/electro-behavior-schema.sql`

```sql
-- Events table (reuse existing or create new)
CREATE TABLE IF NOT EXISTS electro_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id TEXT,
  anon_id TEXT,
  ts TIMESTAMPTZ NOT NULL,
  name TEXT NOT NULL,
  props JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX idx_electro_events_project_ts ON electro_events(project_id, ts DESC);
CREATE INDEX idx_electro_events_user ON electro_events(project_id, user_id, ts DESC);
CREATE INDEX idx_electro_events_props ON electro_events USING GIN(props);

-- Model configurations
CREATE TABLE electro_model_configs (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  org_id UUID NOT NULL,
  model_type TEXT NOT NULL, -- 'ohm_simple', 'rc_retention', 'state_space'
  hyperparams JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimate runs (parameter learning results)
CREATE TABLE electro_estimate_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  org_id UUID NOT NULL,
  segment TEXT,
  model_type TEXT NOT NULL,
  params JSONB NOT NULL,  -- {A, B, C, D, Q, R, RC, etc.}
  fit JSONB NOT NULL,     -- {rmse, r2, log_likelihood}
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimate_runs_project ON electro_estimate_runs(project_id, created_at DESC);

-- Simulation runs (what-if scenarios)
CREATE TABLE electro_simulation_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  org_id UUID NOT NULL,
  request JSONB NOT NULL,   -- Full request payload
  result JSONB,             -- KPI trajectories, confidence bands
  status TEXT DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_sim_runs_project ON electro_simulation_runs(project_id, created_at DESC);

-- Recommendation runs (policy guidance)
CREATE TABLE electro_recommendation_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  org_id UUID NOT NULL,
  request JSONB NOT NULL,
  result JSONB,
  status TEXT DEFAULT 'queued',
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Segments (user cohorts)
CREATE TABLE electro_segments (
  segment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  filter TEXT NOT NULL,  -- SQL WHERE clause or JSONB filter
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Jobs (async task tracking)
CREATE TABLE electro_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  org_id UUID NOT NULL,
  job_type TEXT NOT NULL, -- 'estimate', 'simulate', 'recommend', 'forecast'
  request JSONB NOT NULL,
  result JSONB,
  state TEXT DEFAULT 'queued', -- 'queued', 'running', 'succeeded', 'failed', 'canceled'
  progress_pct INTEGER DEFAULT 0,
  error JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_project ON electro_jobs(project_id, submitted_at DESC);
CREATE INDEX idx_jobs_state ON electro_jobs(state) WHERE state IN ('queued', 'running');

-- RLS policies
ALTER TABLE electro_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE electro_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE electro_estimate_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE electro_simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE electro_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE electro_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY electro_events_isolation ON electro_events
  FOR ALL USING (project_id = current_setting('app.project_id', true));

CREATE POLICY electro_configs_isolation ON electro_model_configs
  FOR ALL USING (project_id = current_setting('app.project_id', true));

-- Add similar RLS policies for other tables
```

---

### **2. API Endpoints** (Next.js API Routes)

**Location**: `backend-vercel/app/api/v1/electro/`

#### **A) Event Ingestion**

**File**: `backend-vercel/app/api/v1/electro/events/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { project_id, events, mode = 'batch' } = await req.json();
    
    // Validate
    if (!project_id || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Insert events
    const { data, error } = await supabase
      .from('electro_events')
      .insert(
        events.map(e => ({
          project_id,
          user_id: e.user_id,
          anon_id: e.anon_id,
          ts: e.ts,
          name: e.name,
          props: e.props || {}
        }))
      );

    if (error) {
      return NextResponse.json(
        { error: 'Failed to ingest events', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      accepted: events.length,
      rejected: 0,
      errors: []
    }, { status: 202 });

  } catch (error) {
    console.error('Event ingestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
```

#### **B) Estimate (Async)**

**File**: `backend-vercel/app/api/v1/electro/estimate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { project_id, model, segments, priors } = await req.json();
    const async = req.nextUrl.searchParams.get('async') === 'true';

    // Validate
    if (!project_id || !model) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    if (async) {
      // Create async job
      const { data: job, error } = await supabase
        .from('electro_jobs')
        .insert({
          project_id,
          org_id: req.headers.get('x-org-id') || 'default',
          job_type: 'estimate',
          request: { model, segments, priors },
          state: 'queued'
        })
        .select()
        .single();

      if (error) throw error;

      // Queue for processing (implement queue worker)
      // await queueJob('estimate', job.job_id);

      return NextResponse.json(
        { job_id: job.job_id, state: 'queued' },
        { 
          status: 202,
          headers: { 'Location': `/v1/electro/jobs/${job.job_id}` }
        }
      );
    } else {
      // Synchronous (for cached results or simple models)
      // TODO: Implement sync estimation or return cached result
      return NextResponse.json(
        { error: 'Sync mode not yet implemented', code: 'NOT_IMPLEMENTED' },
        { status: 501 }
      );
    }

  } catch (error) {
    console.error('Estimate error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
```

#### **C) Simulate**

**File**: `backend-vercel/app/api/v1/electro/simulate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { project_id, model, horizon_days, initial_state, inputs, constraints } = await req.json();
    const async = req.nextUrl.searchParams.get('async') === 'true';

    // Create job
    const { data: job, error } = await supabase
      .from('electro_jobs')
      .insert({
        project_id,
        org_id: req.headers.get('x-org-id') || 'default',
        job_type: 'simulate',
        request: { model, horizon_days, initial_state, inputs, constraints },
        state: 'queued'
      })
      .select()
      .single();

    if (error) throw error;

    // Queue for processing
    // await queueJob('simulate', job.job_id);

    return NextResponse.json(
      { job_id: job.job_id, state: 'queued' },
      { 
        status: 202,
        headers: { 'Location': `/v1/electro/jobs/${job.job_id}` }
      }
    );

  } catch (error) {
    console.error('Simulate error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
```

#### **D) Jobs Status**

**File**: `backend-vercel/app/api/v1/electro/jobs/[job_id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { job_id: string } }
) {
  try {
    const { data: job, error } = await supabase
      .from('electro_jobs')
      .select('*')
      .eq('job_id', params.job_id)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job_id: job.job_id,
      state: job.state,
      submitted_at: job.submitted_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
      progress_pct: job.progress_pct,
      result: job.result,
      error: job.error
    });

  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
```

---

### **3. Python Worker Integration**

**Location**: `backend-vercel/workers/electro/`

#### **Option A: Vercel Background Functions** (Recommended)

**File**: `backend-vercel/app/api/workers/electro-processor/route.ts`

```typescript
// Vercel serverless function with extended timeout
export const config = {
  maxDuration: 300, // 5 minutes for complex simulations
};

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { job_id, job_type } = await req.json();

    // Spawn Python process
    const pythonScript = path.join(process.cwd(), 'lib/electro-behavior/workers/process_job.py');
    const python = spawn('python3', [pythonScript, job_id, job_type]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    await new Promise((resolve, reject) => {
      python.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(errorOutput));
        }
      });
    });

    return NextResponse.json({ success: true, output });

  } catch (error) {
    console.error('Worker error:', error);
    return NextResponse.json(
      { error: 'Worker failed', details: String(error) },
      { status: 500 }
    );
  }
}
```

#### **Option B: Separate Python Service** (More Scalable)

**File**: `backend-vercel/lib/electro-behavior/workers/process_job.py`

```python
#!/usr/bin/env python3
import sys
import os
import json
from supabase import create_client, Client

# Import your modules
sys.path.append(os.path.dirname(__file__) + '/..')
from models.ssm_jax import em_fit, simulate
from decision.bandits import init_lints, sample_theta, pick_action
from control.mpc_cvxpy import mpc_plan

# Supabase client
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def process_estimate_job(job_id: str, request: dict):
    """Process estimate job."""
    # Fetch events
    events = supabase.table('electro_events').select('*').eq(
        'project_id', request['project_id']
    ).execute()
    
    # Convert to Y, U arrays
    # Y = aggregate_to_daily_kpis(events.data)
    # U = extract_controls(events.data)
    
    # Fit model
    # params = em_fit(Y, U, nx=4, iters=20)
    
    # Save results
    supabase.table('electro_jobs').update({
        'state': 'succeeded',
        'result': {
            'segment_params': [/* ... */],
            'fit': {'rmse': 0.05, 'r2': 0.85}
        },
        'finished_at': 'NOW()'
    }).eq('job_id', job_id).execute()

def process_simulate_job(job_id: str, request: dict):
    """Process simulate job."""
    # Load params from previous estimate
    # Run simulation
    # Save results
    pass

def process_recommend_job(job_id: str, request: dict):
    """Process recommend job."""
    # Run bandit or MPC
    # Save results
    pass

if __name__ == '__main__':
    job_id = sys.argv[1]
    job_type = sys.argv[2]
    
    # Fetch job
    job = supabase.table('electro_jobs').select('*').eq('job_id', job_id).single().execute()
    
    # Update state to running
    supabase.table('electro_jobs').update({
        'state': 'running',
        'started_at': 'NOW()'
    }).eq('job_id', job_id).execute()
    
    # Process
    try:
        if job_type == 'estimate':
            process_estimate_job(job_id, job.data['request'])
        elif job_type == 'simulate':
            process_simulate_job(job_id, job.data['request'])
        elif job_type == 'recommend':
            process_recommend_job(job_id, job.data['request'])
    except Exception as e:
        supabase.table('electro_jobs').update({
            'state': 'failed',
            'error': {'message': str(e)},
            'finished_at': 'NOW()'
        }).eq('job_id', job_id).execute()
        raise
```

---

### **4. Integration with Existing Systems**

#### **A) Integrate with PostHog Events**

**Location**: `backend-vercel/app/api/webhooks/posthog-events/route.ts` (existing)

```typescript
// ADD to existing webhook handler
import { mirrorToElectro } from '@/lib/electro-behavior/event-mirror';

export async function POST(req: NextRequest) {
  // ... existing code ...
  
  // Mirror to Electro-Behavior system
  await mirrorToElectro({
    project_id: 'proj_main',
    events: batch.map(event => ({
      user_id: event.distinct_id,
      ts: event.timestamp,
      name: event.event,
      props: event.properties
    }))
  });
  
  // ... rest of existing code ...
}
```

**File**: `backend-vercel/lib/electro-behavior/event-mirror.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function mirrorToElectro(data: {
  project_id: string;
  events: Array<{
    user_id: string;
    ts: string;
    name: string;
    props: Record<string, any>;
  }>;
}) {
  await supabase.from('electro_events').insert(
    data.events.map(e => ({
      project_id: data.project_id,
      user_id: e.user_id,
      ts: e.ts,
      name: e.name,
      props: e.props
    }))
  );
}
```

#### **B) Reuse Existing Marketing Events**

**Alternative**: Use `user_event` table directly

```sql
-- Create view to make user_event compatible
CREATE VIEW electro_events_v AS
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

### **5. Cron Jobs for Background Processing**

**Location**: `backend-vercel/app/api/cron/process-electro-jobs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch queued jobs
    const { data: jobs } = await supabase
      .from('electro_jobs')
      .select('*')
      .eq('state', 'queued')
      .order('submitted_at', { ascending: true })
      .limit(10);

    // Process each job
    for (const job of jobs || []) {
      // Call worker endpoint
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/workers/electro-processor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.job_id,
          job_type: job.job_type
        })
      });
    }

    return NextResponse.json({ processed: jobs?.length || 0 });

  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

**Add to** `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-electro-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## 🚀 Deployment Steps

### **Phase 1: Setup (Week 1)**

1. **Run Database Migration**
   ```bash
   psql $DATABASE_URL -f backend-vercel/migrations/electro-behavior-schema.sql
   ```

2. **Install Python Dependencies**
   ```bash
   cd backend-vercel
   pip install jax jaxlib numpy cvxpy osqp scikit-learn
   ```

3. **Configure Environment Variables**
   ```bash
   # Add to .env
   ELECTRO_ENABLED=true
   PYTHON_PATH=/usr/bin/python3
   ```

### **Phase 2: API Endpoints (Week 2)**

1. Create all API routes in `app/api/v1/electro/`
2. Test with curl/Postman
3. Wire up to existing PostHog webhook

### **Phase 3: Workers (Week 3)**

1. Implement Python worker script
2. Test locally with sample data
3. Deploy to Vercel with extended timeout

### **Phase 4: Dashboard (Week 4)**

1. Build scenario explorer UI
2. Show fit diagnostics
3. Policy recommendations display

---

## 🧪 Testing Plan

### **1. Local Testing**

```bash
# Test Python modules
cd backend-vercel/lib/electro-behavior
python examples/runner.py

# Test API endpoints
curl -X POST http://localhost:3000/api/v1/electro/events \
  -H "Content-Type: application/json" \
  -d '{"project_id": "proj_test", "events": [...]}'
```

### **2. Integration Testing**

```typescript
// __tests__/electro/api.test.ts
describe('Electro-Behavior API', () => {
  it('should ingest events', async () => {
    const res = await fetch('/api/v1/electro/events', {
      method: 'POST',
      body: JSON.stringify({
        project_id: 'proj_test',
        events: [{ user_id: 'u_1', ts: new Date().toISOString(), name: 'test' }]
      })
    });
    expect(res.status).toBe(202);
  });
});
```

---

## 📊 Success Metrics

- [ ] Events ingesting at 1k/sec
- [ ] Estimate jobs complete in < 2min
- [ ] Simulate jobs complete in < 30s (H=7)
- [ ] API p95 < 300ms
- [ ] 3 design partners using weekly

---

## ✅ Checklist

### **Infrastructure**
- [ ] Database schema deployed
- [ ] Python environment configured
- [ ] API endpoints created
- [ ] Worker scripts implemented
- [ ] Cron jobs configured

### **Integration**
- [ ] PostHog events mirroring
- [ ] Existing user_event reuse
- [ ] Auth middleware applied
- [ ] Rate limiting enabled

### **Testing**
- [ ] Unit tests for Python modules
- [ ] API integration tests
- [ ] End-to-end workflow test
- [ ] Performance benchmarks

### **Documentation**
- [ ] API docs published
- [ ] Quickstart guide
- [ ] Dashboard screenshots
- [ ] Troubleshooting guide

---

**The complete implementation plan is ready! Start with Phase 1 and iterate.** 🚀
