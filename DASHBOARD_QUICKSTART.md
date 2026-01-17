# Dashboard Quick Start Guide
**Get Feature Requests & Endpoint Health on reports.everreach.app**

---

## ✅ Prerequisites (Already Done)

- ✅ Dashboard deployed at https://reports.everreach.app
- ✅ Backend API running at https://ever-reach-be.vercel.app
- ✅ Feature requests endpoints available
- ✅ Database tables created

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Migration

This creates the tables needed for test results and health monitoring:

```bash
# Connect to Supabase
psql postgresql://postgres:[password]@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres

# Run migration
\i backend-vercel/migrations/dashboard-test-results.sql
```

### Step 2: Configure Evidence Data Source

Add Supabase connection to your Evidence dashboard:

**In Vercel Environment Variables:**
```
EVIDENCE_DATABASE__supabase__host=db.utasetfxiqcrnwyfforx.supabase.co
EVIDENCE_DATABASE__supabase__port=5432
EVIDENCE_DATABASE__supabase__database=postgres
EVIDENCE_DATABASE__supabase__user=postgres
EVIDENCE_DATABASE__supabase__password=your_supabase_db_password
EVIDENCE_DATABASE__supabase__ssl=true
```

### Step 3: Add SQL Queries

In your Evidence project (`feat/evidence-reports` branch), create these files:

**`sources/feature_requests.sql`:**
```sql
SELECT id, title, description, type, status, priority, votes_count, created_at, tags
FROM feature_requests
ORDER BY votes_count DESC, created_at DESC
LIMIT 100;
```

**`sources/endpoint_health.sql`:**
```sql
SELECT endpoint_path, method, total_tests, passing, failing, pass_rate, 
       avg_response_time_ms, last_tested, health_status
FROM endpoint_health_dashboard
ORDER BY CASE health_status WHEN 'down' THEN 1 WHEN 'degraded' THEN 2 ELSE 3 END;
```

**`sources/test_suites.sql`:**
```sql
SELECT suite_name, total_tests, passing, failing, pass_rate, last_executed
FROM test_summary_by_suite
ORDER BY last_executed DESC;
```

---

## 📊 Dashboard Pages

Create these pages in your Evidence project:

### `pages/features.md`
```markdown
# Feature Requests

<DataTable data={feature_requests}>
  <Column id=title />
  <Column id=votes_count title="Votes" />
  <Column id=status />
  <Column id=type />
  <Column id=created_at fmt=date />
</DataTable>
```

### `pages/health.md`
```markdown
# API Health

<DataTable data={endpoint_health}>
  <Column id=endpoint_path />
  <Column id=method />
  <Column id=pass_rate fmt=pct />
  <Column id=health_status />
</DataTable>
```

---

## 🔄 Deploy

```bash
git add .
git commit -m "feat: add feature requests and health data"
git push origin feat/evidence-reports
```

Vercel auto-deploys → visit https://reports.everreach.app

---

## 📱 Test the Dashboard

1. **Visit:** https://reports.everreach.app/features
2. **Should see:** List of feature requests with votes
3. **Visit:** https://reports.everreach.app/health
4. **Should see:** API endpoint health status

---

## 🎯 What You'll Get

### Feature Requests Page
- All user-submitted feature requests
- Vote counts
- Status (pending, planned, in progress, shipped)
- Type (feature, feedback, bug)

### Health Page
- All API endpoints
- Pass rates
- Response times
- Health status (healthy, degraded, down)

### Test Suites Page
- All test suites
- Pass/fail counts
- Latest execution times

---

## 📚 Full Documentation

See `EVIDENCE_DASHBOARD_INTEGRATION.md` for:
- Complete SQL queries
- Advanced dashboard pages
- Charts and visualizations
- Filtering and sorting
- Customization options

---

**Time to Complete:** 15-30 minutes  
**Status:** Ready to implement  
**Next:** Run Step 1 to create database tables
