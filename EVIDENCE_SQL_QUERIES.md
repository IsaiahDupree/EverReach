# Evidence Dashboard SQL Queries
**Ready-to-use queries for reports.everreach.app**

---

## ✅ Database Setup Complete

Using Supabase MCP, I've successfully:
- ✅ Created `test_results` table with RLS policies
- ✅ Created 3 dashboard views (`endpoint_health_dashboard`, `test_summary_by_suite`, `latest_test_results_by_endpoint`)
- ✅ Inserted sample test data (14 test results)
- ✅ Verified feature_requests table exists with data

---

## 📊 SQL Queries for Evidence Dashboard

### 1. Feature Requests Overview
**File:** `sources/feature_requests.sql`

```sql
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
  END as status_display
FROM feature_requests
ORDER BY votes_count DESC, created_at DESC
LIMIT 100;
```

### 2. Feature Request Stats
**File:** `sources/feature_stats.sql`

```sql
SELECT
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'backlog') as pending,
  COUNT(*) FILTER (WHERE status = 'reviewing') as reviewing,
  COUNT(*) FILTER (WHERE status = 'planned') as planned,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
  COUNT(*) FILTER (WHERE status = 'declined') as declined,
  SUM(votes_count) as total_votes,
  ROUND(AVG(votes_count)::numeric, 1) as avg_votes,
  MAX(votes_count) as max_votes
FROM feature_requests;
```

### 3. Top Voted Features
**File:** `sources/top_features.sql`

```sql
SELECT
  id,
  title,
  votes_count,
  status,
  type,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at)::int as days_old
FROM feature_requests
WHERE status NOT IN ('shipped', 'declined')
ORDER BY votes_count DESC
LIMIT 10;
```

### 4. Endpoint Health (Main View)
**File:** `sources/endpoint_health.sql`

```sql
SELECT
  endpoint_path,
  method,
  total_tests,
  passing,
  failing,
  pass_rate,
  ROUND(avg_response_time_ms::numeric, 0) as avg_response_time_ms,
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

### 5. Test Suites Summary
**File:** `sources/test_suites.sql`

```sql
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

### 6. Recent Test Results
**File:** `sources/recent_tests.sql`

```sql
SELECT
  suite_name,
  test_name,
  endpoint_path,
  method,
  status,
  duration_ms,
  error_message,
  executed_at
FROM test_results
WHERE executed_at > NOW() - INTERVAL '7 days'
ORDER BY executed_at DESC
LIMIT 100;
```

---

## 📄 Evidence Dashboard Pages

### Page 1: Feature Requests
**File:** `pages/features.md`

```markdown
# 🎯 Feature Requests Dashboard

## Summary

```sql feature_stats
SELECT * FROM feature_stats;
```

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

## 🔥 Top Voted Features

```sql top_features
SELECT * FROM top_features;
```

<DataTable data={top_features}>
  <Column id=title />
  <Column id=votes_count fmt=num0 title="Votes" />
  <Column id=status />
  <Column id=days_old fmt=num0 title="Days Old" />
</DataTable>

## 📋 All Feature Requests

```sql feature_requests
SELECT * FROM feature_requests;
```

<DataTable 
  data={feature_requests}
  search=true
  rows=20
>
  <Column id=status_display title="Status" />
  <Column id=title />
  <Column id=votes_count fmt=num0 title="Votes" />
  <Column id=type />
  <Column id=created_at fmt=date />
</DataTable>
```

### Page 2: API Health
**File:** `pages/health.md`

```markdown
# 🏥 API Health Dashboard

## Endpoint Status

```sql endpoint_health
SELECT * FROM endpoint_health;
```

<DataTable 
  data={endpoint_health}
  search=true
  rows=50
>
  <Column id=status_icon title="" />
  <Column id=endpoint_path title="Endpoint" />
  <Column id=method />
  <Column id=pass_rate fmt=pct title="Pass Rate" />
  <Column id=avg_response_time_ms fmt=num0 title="Response (ms)" />
  <Column id=total_tests fmt=num0 />
  <Column id=last_tested fmt=datetime />
</DataTable>

## Test Suites

```sql test_suites
SELECT * FROM test_suites;
```

<DataTable data={test_suites}>
  <Column id=suite_name title="Suite" />
  <Column id=total_tests fmt=num0 />
  <Column id=passing fmt=num0 />
  <Column id=failing fmt=num0 />
  <Column id=pass_rate fmt=pct />
  <Column id=avg_duration_ms fmt=num2 title="Avg Duration (ms)" />
  <Column id=last_executed fmt=datetime />
</DataTable>
```

### Page 3: Recent Tests
**File:** `pages/tests.md`

```markdown
# 🧪 Recent Test Results

```sql recent_tests
SELECT * FROM recent_tests;
```

<DataTable 
  data={recent_tests}
  search=true
  rows=50
>
  <Column id=suite_name title="Suite" />
  <Column id=test_name title="Test" />
  <Column id=endpoint_path title="Endpoint" />
  <Column id=method />
  <Column id=status />
  <Column id=duration_ms fmt=num0 title="Duration (ms)" />
  <Column id=executed_at fmt=datetime />
</DataTable>
```

---

## 🔌 Current Database Connection

**Project:** everreach (utasetfxiqcrnwyfforx)  
**Status:** ✅ ACTIVE_HEALTHY  
**Region:** us-east-2  
**Postgres Version:** 17.6

**Connection String:**
```
Host: db.utasetfxiqcrnwyfforx.supabase.co
Port: 5432
Database: postgres
SSL: Required
```

---

## 📊 Sample Data Available

### Feature Requests
- 5+ feature requests with votes
- Status: backlog
- All with vote counts

### Test Results  
- 14 test results inserted
- Covering 10+ endpoints
- All tests passing (100% pass rate)
- Average response times: 45ms - 850ms

### Health Status
- 10+ endpoints monitored
- All currently healthy
- Response times tracked

---

## 🚀 Deploy to Evidence Dashboard

1. **In your Evidence project** (`feat/evidence-reports` branch):
   ```bash
   mkdir -p sources pages
   ```

2. **Copy SQL queries** from above into `sources/` folder

3. **Copy markdown pages** from above into `pages/` folder

4. **Set database connection** in Vercel env vars:
   ```
   EVIDENCE_DATABASE__supabase__host=db.utasetfxiqcrnwyfforx.supabase.co
   EVIDENCE_DATABASE__supabase__port=5432
   EVIDENCE_DATABASE__supabase__database=postgres
   EVIDENCE_DATABASE__supabase__user=postgres
   EVIDENCE_DATABASE__supabase__password=[YOUR_PASSWORD]
   EVIDENCE_DATABASE__supabase__ssl=true
   ```

5. **Test locally:**
   ```bash
   npm run sources
   npm run dev
   ```

6. **Deploy:**
   ```bash
   git add .
   git commit -m "feat: add feature requests and health dashboards"
   git push origin feat/evidence-reports
   ```

---

## ✅ Verification

Test your queries in Supabase:

```sql
-- Should return 5 requests
SELECT COUNT(*) FROM feature_requests;

-- Should return 14 results
SELECT COUNT(*) FROM test_results;

-- Should return 10+ endpoints
SELECT COUNT(*) FROM endpoint_health_dashboard;

-- Should return 3+ suites
SELECT COUNT(*) FROM test_summary_by_suite;
```

---

**Status:** ✅ Database ready, queries tested, sample data loaded  
**Next Step:** Deploy to Evidence dashboard at reports.everreach.app  
**Documentation:** See DASHBOARD_QUICKSTART.md for full setup guide
