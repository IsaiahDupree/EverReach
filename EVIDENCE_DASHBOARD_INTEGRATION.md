# Evidence Dashboard Integration
**Populating reports.everreach.app with Feature Requests & Endpoint Health**

---

## 🎯 Dashboard Information

**Production URL:** https://reports.everearch.app  
**Vercel Project:** everreach-dashboard  
**Branch:** feat/evidence-reports  
**Latest Commit:** 61ebf74 - "feat: add event analytics dashboard with real data integration"  
**Status:** ✅ Ready (Deployed 2 days ago)

---

## 📊 Data Sources to Add

### 1. Feature Requests Data Source

Create `/sources/feature_requests.sql` in your Evidence project:

```sql
-- Feature Requests Overview
SELECT
  id,
  title,
  description,
  type,
  status,
  priority,
  votes_count,
  created_at,
  updated_at,
  tags,
  CASE
    WHEN status = 'shipped' THEN '✅ Shipped'
    WHEN status = 'in_progress' THEN '🔨 In Progress'
    WHEN status = 'planned' THEN '📅 Planned'
    WHEN status = 'reviewing' THEN '👀 Reviewing'
    WHEN status = 'declined' THEN '❌ Declined'
    ELSE '📝 Pending'
  END as status_display,
  CASE
    WHEN priority = 'critical' THEN 4
    WHEN priority = 'high' THEN 3
    WHEN priority = 'medium' THEN 2
    ELSE 1
  END as priority_rank
FROM feature_requests
ORDER BY votes_count DESC, created_at DESC
LIMIT 100;
```

### 2. Feature Request Stats

Create `/sources/feature_stats.sql`:

```sql
-- Feature Request Statistics
SELECT
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'reviewing') as reviewing,
  COUNT(*) FILTER (WHERE status = 'planned') as planned,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
  COUNT(*) FILTER (WHERE status = 'declined') as declined,
  SUM(votes_count) as total_votes,
  AVG(votes_count) as avg_votes,
  MAX(votes_count) as max_votes
FROM feature_requests;
```

### 3. Top Voted Features

Create `/sources/top_features.sql`:

```sql
-- Top 10 Feature Requests by Votes
SELECT
  title,
  votes_count,
  status,
  type,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at) as days_old
FROM feature_requests
WHERE status NOT IN ('shipped', 'declined')
ORDER BY votes_count DESC
LIMIT 10;
```

### 4. Endpoint Health Data

Create `/sources/endpoint_health.sql`:

```sql
-- Endpoint Health Dashboard
SELECT
  endpoint_path,
  method,
  total_tests,
  passing,
  failing,
  pass_rate,
  avg_response_time_ms,
  last_tested,
  health_status,
  CASE health_status
    WHEN 'healthy' THEN '✅'
    WHEN 'degraded' THEN '⚠️'
    WHEN 'down' THEN '❌'
  END as status_icon
FROM endpoint_health_dashboard
ORDER BY 
  CASE health_status
    WHEN 'down' THEN 1
    WHEN 'degraded' THEN 2
    WHEN 'healthy' THEN 3
  END,
  pass_rate ASC;
```

### 5. Test Summary by Suite

Create `/sources/test_suites.sql`:

```sql
-- Test Results by Suite
SELECT
  suite_name,
  total_tests,
  passing,
  failing,
  skipped,
  pass_rate,
  ROUND(avg_duration_ms::numeric, 2) as avg_duration_ms,
  last_executed
FROM test_summary_by_suite
ORDER BY last_executed DESC;
```

### 6. Service Status

Create `/sources/service_status.sql`:

```sql
-- External Service Health
SELECT
  service,
  is_healthy,
  response_time_ms,
  checked_at,
  error_message,
  CASE 
    WHEN is_healthy THEN '✅ Healthy'
    ELSE '❌ Down'
  END as status_display
FROM latest_service_status
ORDER BY 
  CASE WHEN is_healthy THEN 2 ELSE 1 END,
  service;
```

---

## 📄 Dashboard Pages to Create

### Page 1: Feature Requests Overview (`/pages/features/index.md`)

```markdown
# Feature Requests Dashboard

## Summary Statistics

<BigValue 
  data={feature_stats} 
  value=total_requests
  title="Total Requests"
/>

<BigValue 
  data={feature_stats} 
  value=total_votes
  title="Total Votes"
/>

<BigValue 
  data={feature_stats} 
  value=in_progress
  title="In Progress"
/>

<BigValue 
  data={feature_stats} 
  value=shipped
  title="Shipped"
/>

## Status Breakdown

<BarChart
  data={feature_stats}
  x=status
  y=count
  title="Feature Requests by Status"
/>

## Top Voted Features

<DataTable
  data={top_features}
  rows=10
>
  <Column id=title />
  <Column id=votes_count fmt=num0 />
  <Column id=status />
  <Column id=type />
  <Column id=days_old fmt=num0 />
</DataTable>

## All Feature Requests

<DataTable
  data={feature_requests}
  search=true
  rows=20
>
  <Column id=status_display title="Status" />
  <Column id=title />
  <Column id=votes_count fmt=num0 title="Votes" />
  <Column id=type />
  <Column id=priority />
  <Column id=created_at fmt=date />
</DataTable>
```

### Page 2: API Health (`/pages/health/index.md`)

```markdown
# API Health Dashboard

## Endpoint Health Overview

<BigValue 
  data={endpoint_health}
  value=healthy
  title="Healthy Endpoints"
  fmt=num0
/>

<BigValue 
  data={endpoint_health}
  value=degraded
  title="Degraded"
  fmt=num0
/>

<BigValue 
  data={endpoint_health}
  value=down
  title="Down"
  fmt=num0
/>

## Endpoint Status

<DataTable
  data={endpoint_health}
  search=true
  rows=20
>
  <Column id=status_icon title="" />
  <Column id=endpoint_path title="Endpoint" />
  <Column id=method />
  <Column id=pass_rate fmt=pct />
  <Column id=avg_response_time_ms fmt=num0 title="Avg Response (ms)" />
  <Column id=last_tested fmt=datetime />
</DataTable>

## Test Suites

<DataTable
  data={test_suites}
>
  <Column id=suite_name title="Suite" />
  <Column id=total_tests fmt=num0 />
  <Column id=passing fmt=num0 />
  <Column id=failing fmt=num0 />
  <Column id=pass_rate fmt=pct />
  <Column id=avg_duration_ms fmt=num2 />
  <Column id=last_executed fmt=datetime />
</DataTable>

## External Services

<DataTable
  data={service_status}
>
  <Column id=status_display title="Status" />
  <Column id=service title="Service" />
  <Column id=response_time_ms fmt=num0 title="Response (ms)" />
  <Column id=checked_at fmt=datetime />
</DataTable>
```

---

## 🔌 Configure Database Connection

### Option 1: Via Evidence UI (Recommended)

1. Go to https://reports.everreach.app
2. Click **Settings** → **Data Sources**
3. Click **Add Data Source**
4. Select **PostgreSQL**
5. Enter connection details:
   ```
   Host: db.utasetfxiqcrnwyfforx.supabase.co
   Port: 5432
   Database: postgres
   User: postgres
   Password: [Your Supabase DB Password]
   SSL: Enabled
   ```

### Option 2: Via Environment Variables

Add to your Vercel environment variables:

```bash
EVIDENCE_DATABASE__utasetfxiqcrnwyfforx__host=db.utasetfxiqcrnwyfforx.supabase.co
EVIDENCE_DATABASE__utasetfxiqcrnwyfforx__port=5432
EVIDENCE_DATABASE__utasetfxiqcrnwyfforx__database=postgres
EVIDENCE_DATABASE__utasetfxiqcrnwyfforx__user=postgres
EVIDENCE_DATABASE__utasetfxiqcrnwyfforx__password=your_password_here
EVIDENCE_DATABASE__utasetfxiqcrnwyfforx__ssl=true
```

### Option 3: Using Supabase Connection String

```bash
DATABASE_URL=postgresql://postgres:[password]@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres
```

---

## 🚀 Quick Deploy Steps

### 1. Add SQL Queries to Your Evidence Project

```bash
# In your Evidence project repo (feat/evidence-reports branch)
mkdir -p sources
touch sources/feature_requests.sql
touch sources/feature_stats.sql
touch sources/top_features.sql
touch sources/endpoint_health.sql
touch sources/test_suites.sql
touch sources/service_status.sql
```

### 2. Create Dashboard Pages

```bash
mkdir -p pages/features
mkdir -p pages/health
touch pages/features/index.md
touch pages/health/index.md
```

### 3. Run Locally to Test

```bash
npm run sources  # Fetch data from database
npm run dev      # Start dev server
```

### 4. Deploy to Vercel

```bash
git add .
git commit -m "feat: add feature requests and health dashboards"
git push origin feat/evidence-reports
```

Vercel will auto-deploy to `reports.everreach.app`

---

## 📊 Expected Dashboard Views

### Feature Requests Page
```
┌──────────────────────────────────────────┐
│  Feature Requests Dashboard              │
├──────────────────────────────────────────┤
│  Total: 45  |  Votes: 287  |  Progress: 12│
├──────────────────────────────────────────┤
│  Top Voted Features:                     │
│  1. Dark Mode (45 votes) - In Progress  │
│  2. CSV Export (38 votes) - Planned     │
│  3. Bulk Actions (32 votes) - Planned   │
├──────────────────────────────────────────┤
│  [Interactive Table with all requests]   │
└──────────────────────────────────────────┘
```

### API Health Page
```
┌──────────────────────────────────────────┐
│  API Health Dashboard                    │
├──────────────────────────────────────────┤
│  Healthy: 28  |  Degraded: 3  |  Down: 1 │
├──────────────────────────────────────────┤
│  Endpoints:                              │
│  ✅ GET /contacts (100%, 125ms)         │
│  ⚠️ GET /goals (75%, 220ms)             │
│  ❌ POST /goals (40%, 500ms)            │
├──────────────────────────────────────────┤
│  External Services:                      │
│  ✅ Supabase (45ms)                     │
│  ✅ OpenAI (180ms)                      │
└──────────────────────────────────────────┘
```

---

## 🔄 Real-Time Data Flow

```
Test Runner (CI/CD)
    ↓
POST /api/v1/dashboard/test-results
    ↓
Supabase (test_results table)
    ↓
Evidence Dashboard SQL Queries
    ↓
reports.everreach.app
```

---

## 📝 Next Steps

1. **Run the database migration** to create tables:
   ```bash
   psql $DATABASE_URL -f backend-vercel/migrations/dashboard-test-results.sql
   ```

2. **Configure Evidence data source** with Supabase credentials

3. **Add the SQL queries** to your Evidence project

4. **Create dashboard pages** using Evidence markdown

5. **Test locally** with `npm run dev`

6. **Deploy** to production

---

## 🎨 Customization Options

### Add Charts

```markdown
<!-- Votes over time -->
<LineChart
  data={feature_requests}
  x=created_at
  y=votes_count
  title="Vote Growth Over Time"
/>

<!-- Status pie chart -->
<PieChart
  data={feature_stats}
  name=status
  value=count
/>
```

### Add Filters

```markdown
<!-- Filter by status -->
<Dropdown
  data={feature_requests}
  name=status_filter
  value=status
/>

<DataTable
  data={feature_requests}
  where={status_filter}
/>
```

---

## 📚 Resources

- **Evidence Docs:** https://docs.evidence.dev
- **Feature Requests API:** [FEATURE_REQUESTS_SYSTEM.md](./FEATURE_REQUESTS_SYSTEM.md)
- **Dashboard API:** [DASHBOARD_MONITORING_SYSTEM.md](./DASHBOARD_MONITORING_SYSTEM.md)
- **Backend API:** https://ever-reach-be.vercel.app

---

**Status:** Ready to implement  
**Estimated Time:** 1-2 hours  
**Last Updated:** November 11, 2025
