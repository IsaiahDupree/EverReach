# MetaCoach → Everreach Integration

Complete integration package to display Instagram/Facebook metrics in your Everreach dashboard at **https://reports.everreach.app/**

---

## 📦 What's Included

```
everreach-integration/
├── types.ts                    # TypeScript type definitions
├── api-proxy.ts                # Backend API proxy
├── MetaStatusWidget.tsx        # Status indicator component
├── MetaMetricsDashboard.tsx    # Performance metrics dashboard
├── README.md                   # This file
└── .env.example                # Environment variables template
```

---

## 🚀 Quick Start

### Step 1: Set Up Environment Variables

Add to your Everreach `.env` or Vercel environment variables:

```bash
# MetaCoach API Configuration
METACOACH_API_URL=https://www.matrixloop.app
META_ACCESS_TOKEN=your_meta_access_token_here
```

**How to get `META_ACCESS_TOKEN`:**
1. Go to https://www.matrixloop.app/connect
2. Complete OAuth flow
3. Open browser DevTools (F12)
4. Go to Application → Cookies → https://www.matrixloop.app
5. Copy the value of `meta_access_token`

---

### Step 2: Add API Proxy Route

Create the API proxy route in your Everreach project:

**For Next.js App Router:**
Create `app/api/meta/[...path]/route.ts`:

```typescript
// Copy content from api-proxy.ts
import { GET } from '@/lib/meta/api-proxy';
export { GET };
```

**For Next.js Pages Router:**
Create `pages/api/meta/[...path].ts`:

```typescript
// Copy default export from api-proxy.ts
export { default } from '@/lib/meta/api-proxy';
```

---

### Step 3: Add TypeScript Types

Copy `types.ts` to your project:

```
Everreach/
└── lib/
    └── meta/
        └── types.ts    # <- Copy here
```

---

### Step 4: Add React Components

Copy the components to your project:

```
Everreach/
└── components/
    └── meta/
        ├── MetaStatusWidget.tsx        # <- Copy here
        └── MetaMetricsDashboard.tsx    # <- Copy here
```

---

### Step 5: Create Instagram Report Page

Create a new page in your Everreach dashboard:

**For App Router:**
Create `app/reports/instagram/page.tsx`:

```typescript
import { MetaStatusWidget } from '@/components/meta/MetaStatusWidget';
import { MetaMetricsDashboard } from '@/components/meta/MetaMetricsDashboard';

export default function InstagramReportPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Instagram Performance</h1>
      
      {/* Status Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetaStatusWidget />
        {/* Add other status widgets here */}
      </div>
      
      {/* Metrics Dashboard */}
      <MetaMetricsDashboard />
    </div>
  );
}
```

**For Pages Router:**
Create `pages/reports/instagram.tsx`:

```typescript
import { MetaStatusWidget } from '@/components/meta/MetaStatusWidget';
import { MetaMetricsDashboard } from '@/components/meta/MetaMetricsDashboard';

export default function InstagramReportPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Instagram Performance</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetaStatusWidget />
      </div>
      
      <MetaMetricsDashboard />
    </div>
  );
}
```

---

### Step 6: Add to Navigation

Update your Everreach navigation to include Instagram reports:

```typescript
// In your navigation component
const reportPages = [
  // ... existing pages
  {
    name: 'Instagram',
    href: '/reports/instagram',
    icon: InstagramIcon,
    description: 'Instagram performance metrics and AI analysis'
  }
];
```

---

### Step 7: Deploy

```bash
# Commit changes
git add .
git commit -m "feat: add Instagram metrics from MetaCoach"

# Push to trigger deployment
git push origin main

# Vercel will automatically deploy
```

---

## 📊 What You'll See

### Status Widget

Shows real-time API health:
- 🟢 UP / 🟡 DEGRADED / 🔴 DOWN status
- Response latency (ms)
- Rate limit usage (%)
- Auto-refresh every 30 seconds
- Manual refresh button

### Metrics Dashboard

Displays comprehensive performance data:

**Organic Content:**
- Posts published
- Total reach
- Engagement (likes, comments, shares, saves)
- Engagement rate

**AI Analysis:**
- Number of analyzed posts
- Average hook score (0-100)
- Average thumbnail score (0-100)
- Overall content quality

**Ad Performance** (if available):
- Ad spend
- Impressions & Clicks
- Conversions & ROAS
- CPM, CPC, CTR

**Time Range Options:**
- Last 24 hours
- Last 7 days
- Last 30 days

---

## 🔧 Configuration

### Environment Variables

Required variables for Everreach:

| Variable | Description | Example |
|----------|-------------|---------|
| `METACOACH_API_URL` | MetaCoach API base URL | `https://www.matrixloop.app` |
| `META_ACCESS_TOKEN` | Meta API access token | `EAAG...` (from cookie) |

### Caching

The API proxy includes built-in caching (5 minutes) to reduce API calls:

```typescript
// Adjust cache TTL in api-proxy.ts
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### Auto-Refresh

Components auto-refresh at different intervals:

```typescript
// MetaStatusWidget.tsx
const REFRESH_INTERVAL = 30000; // 30 seconds

// MetaMetricsDashboard.tsx
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
```

---

## 🧪 Testing

### Test API Proxy Locally

```bash
# Start Everreach dev server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/meta/health

# Test metrics endpoint
curl http://localhost:3000/api/meta/metrics

# Test with date range
curl "http://localhost:3000/api/meta/metrics?from=2025-11-01T00:00:00Z&to=2025-11-08T00:00:00Z"
```

### Test Components

Navigate to:
```
http://localhost:3000/reports/instagram
```

You should see:
1. ✅ Status widget with green/yellow/red indicator
2. ✅ Metrics dashboard with data
3. ✅ Time range selector working
4. ✅ Auto-refresh happening

---

## 🐛 Troubleshooting

### "Failed to fetch from MetaCoach"

**Cause:** Missing or invalid `META_ACCESS_TOKEN`

**Solution:**
1. Get fresh token from https://www.matrixloop.app/connect
2. Update environment variable
3. Redeploy or restart dev server

### "CORS error"

**Cause:** Direct browser calls to MetaCoach API

**Solution:** Ensure you're using the `/api/meta/*` proxy, not calling MetaCoach directly

### "No data showing"

**Cause:** Instagram account not connected or no permissions

**Solution:**
1. Verify Instagram Business Account is linked
2. Check permissions in Meta App settings
3. Complete OAuth flow again

### "Rate limit exceeded"

**Cause:** Too many API calls to Meta Graph API

**Solution:**
1. Increase cache TTL in `api-proxy.ts`
2. Reduce auto-refresh frequency
3. Wait for rate limit to reset (hourly)

---

## 📈 Advanced Features

### Add Trend Indicators

Show week-over-week or month-over-month changes:

```typescript
function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  
  return (
    <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
    </span>
  );
}
```

### Add Alert System

Set up alerts for critical metrics:

```typescript
// In MetaMetricsDashboard.tsx
useEffect(() => {
  if (!metrics) return;
  
  // Alert if ROAS drops below 2.0
  if (metrics.ads?.roas && metrics.ads.roas < 2.0) {
    sendAlert('Low ROAS', `ROAS dropped to ${metrics.ads.roas.toFixed(2)}x`);
  }
  
  // Alert if engagement rate drops below 5%
  if (metrics.organic.engagement_rate < 5.0) {
    sendAlert('Low Engagement', `Rate at ${metrics.organic.engagement_rate.toFixed(1)}%`);
  }
}, [metrics]);
```

### Add Charts

Install chart library:

```bash
npm install recharts
```

Add line chart for metrics over time:

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function MetricsChart({ data }: { data: MetaMetricsResponse }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.metrics}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="reach" stroke="#8884d8" />
        <Line type="monotone" dataKey="engagement" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** - Use `.gitignore`
2. **Use Vercel environment variables** for production
3. **Rotate tokens regularly** (Meta tokens expire in 60 days)
4. **Implement rate limiting** on your API proxy if needed
5. **Use HTTPS only** in production

---

## 📞 Support

**MetaCoach Issues:**
- Check `docs/DASHBOARD_INTEGRATION.md` in MetaCoach repo
- Review API responses in browser DevTools

**Everreach Issues:**
- Check Vercel deployment logs
- Verify environment variables are set
- Test API proxy endpoints directly

---

## 🎯 Next Steps

After basic integration:

1. **Add to homepage** - Show key metrics on dashboard home
2. **Set up alerts** - Email/Slack notifications for issues
3. **Add charts** - Visualize trends over time
4. **Export data** - CSV download for reports
5. **Schedule emails** - Daily/weekly performance summaries

---

## 🎊 You're Done!

Your Everreach dashboard now has Instagram/Facebook monitoring powered by MetaCoach! 🚀

**Visit:** https://reports.everreach.app/reports/instagram

**What's Available:**
- ✅ Real-time API health status
- ✅ Organic content metrics
- ✅ AI analysis scores
- ✅ Ad performance data
- ✅ Auto-refresh & caching
- ✅ Mobile responsive

Ready to provide amazing Instagram insights to your users!
