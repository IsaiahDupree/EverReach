# 🎯 Unified Paywall System - Implementation Handoff

**Complete Guide for Mobile & Web App Integration**

---

## 📊 **System Overview**

### **Current Status: PRODUCTION READY** ✅
- **Backend URL**: https://ever-reach-be.vercel.app
- **Test Results**: 45/45 tests passing (100%)
- **Database**: All migrations applied
- **Endpoints**: 15 fully functional
- **Cron Jobs**: 22 configured (need to optimize to 20)

### **What You're Getting**
A complete unified paywall orchestration system that:
- Supports **2 providers** (Superwall + RevenueCat)
- Works on **4 platforms** (iOS, Android, Web, Expo)
- Tracks **5 event types** (impression, dismissal, conversion, renewal, cancellation)
- Provides **real-time analytics**
- Sends **automated email reports**
- Monitors with **4 alert types**
- Calculates **statistical significance** for A/B tests
- Analyzes **cohorts** for retention tracking

---

## 🔌 **API Endpoints Reference**

### **1. Configuration Endpoint** (Mobile & Web)

#### **GET /api/v1/config/paywall-unified**
Fetch the paywall configuration for a specific platform.

**Headers:**
```http
Authorization: Bearer <user_token>
```

**Query Parameters:**
- `platform` (required): `ios` | `android` | `web` | `expo`

**Response:**
```json
{
  "active_provider": "revenuecat",
  "superwall": {
    "enabled": false
  },
  "revenuecat": {
    "enabled": true,
    "ios_key": "appl_xxx",
    "android_key": "goog_xxx",
    "web_key": "rcb_xxx",
    "stripe_key": null,
    "offerings": null
  },
  "ab_test": {
    "enabled": false,
    "name": null,
    "start_date": null,
    "end_date": null,
    "assignment": null
  }
}
```

**Implementation Example (React Native/Expo):**
```typescript
import { useAuth } from '@/providers/AuthProvider';

async function fetchPaywallConfig(platform: 'ios' | 'android' | 'web' | 'expo') {
  const { session } = useAuth();
  
  const response = await fetch(
    `https://ever-reach-be.vercel.app/api/v1/config/paywall-unified?platform=${platform}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );
  
  if (!response.ok) throw new Error('Failed to fetch config');
  return response.json();
}

// Usage
const config = await fetchPaywallConfig('ios');
const provider = config.active_provider; // 'superwall' or 'revenuecat'
const apiKey = provider === 'superwall' 
  ? config.superwall.ios_key 
  : config.revenuecat.ios_key;
```

---

### **2. Webhook Endpoints** (Backend Only - No Client Integration Needed)

#### **POST /api/v1/webhook/superwall**
Receives Superwall events (paywall_open, paywall_close, transaction_complete)

#### **POST /api/v1/webhook/revenuecat**
Receives RevenueCat events (INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.)

**Note:** These are configured in provider dashboards, not called by your app.

---

### **3. Analytics Endpoint** (Web Dashboard)

#### **GET /api/v1/analytics/paywall**
Fetch paywall analytics data.

**Headers:**
```http
Authorization: Bearer <user_token>
```

**Query Parameters:**
- `start_date` (required): ISO 8601 date (e.g., `2025-11-01`)
- `end_date` (required): ISO 8601 date
- `provider` (optional): `all` | `superwall` | `revenuecat` (default: `all`)
- `platform` (optional): `all` | `ios` | `android` | `web` | `expo` (default: `all`)
- `group_by` (optional): `day` | `placement` | `provider` (default: `day`)

**Response:**
```json
{
  "summary": {
    "total_impressions": 1234,
    "total_conversions": 89,
    "conversion_rate": 7.21,
    "total_revenue": 891.00,
    "avg_revenue_per_user": 10.01
  },
  "by_day": [
    {
      "date": "2025-11-14",
      "impressions": 150,
      "conversions": 12,
      "conversion_rate": 8.0,
      "revenue": 120.00
    }
  ],
  "by_provider": { ... },
  "by_platform": { ... },
  "top_placements": [ ... ]
}
```

---

### **4. Email Reports** (Web Dashboard)

#### **GET /api/v1/analytics/paywall/reports**
List all report subscriptions.

#### **POST /api/v1/analytics/paywall/reports**
Create a new report subscription.

**Request Body:**
```json
{
  "frequency": "daily",
  "hour_of_day": 9,
  "timezone": "America/New_York",
  "email_addresses": ["team@example.com"],
  "include_kpis": true,
  "include_charts": true,
  "include_top_placements": true,
  "include_recent_conversions": false,
  "provider": "all",
  "platform": "all"
}
```

#### **PATCH /api/v1/analytics/paywall/reports/:id**
Update an existing subscription.

#### **DELETE /api/v1/analytics/paywall/reports/:id**
Delete a subscription.

---

### **5. Conversion Alerts** (Web Dashboard)

#### **GET /api/v1/analytics/paywall/alerts**
List all alerts.

#### **POST /api/v1/analytics/paywall/alerts**
Create a new alert.

**Request Body:**
```json
{
  "name": "Low Conversion Rate",
  "alert_type": "conversion_rate_drop",
  "threshold": 5.0,
  "lookback_period": 7,
  "comparison_period": 7,
  "email_addresses": ["team@example.com"],
  "provider": "all",
  "platform": "all",
  "enabled": true,
  "cooldown_hours": 24
}
```

**Alert Types:**
- `conversion_rate_drop` - Alert when conversion rate drops below threshold
- `revenue_drop` - Alert when revenue drops below threshold (in USD)
- `no_conversions` - Alert when no conversions in lookback period
- `high_dismissal_rate` - Alert when dismissal rate above threshold

---

### **6. A/B Test Statistics** (Web Dashboard)

#### **GET /api/v1/analytics/paywall/ab-test-stats**
Calculate statistical significance between Superwall and RevenueCat.

**Query Parameters:**
- `start_date` (optional): ISO 8601 date (default: 30 days ago)
- `end_date` (optional): ISO 8601 date (default: now)
- `confidence_level` (optional): 0.90 | 0.95 | 0.99 (default: 0.95)

**Response:**
```json
{
  "test_period": {
    "start_date": "2025-10-16T00:00:00Z",
    "end_date": "2025-11-15T00:00:00Z",
    "days": 30
  },
  "results": [
    {
      "provider": "superwall",
      "impressions": 1200,
      "conversions": 96,
      "conversion_rate": 8.0,
      "revenue_usd": 960.00,
      "standard_error": 0.78,
      "z_score": 2.14,
      "p_value": 0.032,
      "is_significant": true,
      "confidence_interval_lower": 6.5,
      "confidence_interval_upper": 9.5
    },
    {
      "provider": "revenuecat",
      "impressions": 1180,
      "conversions": 71,
      "conversion_rate": 6.0,
      "revenue_usd": 710.00,
      "standard_error": 0.78,
      "z_score": 2.14,
      "p_value": 0.032,
      "is_significant": true,
      "confidence_interval_lower": 4.5,
      "confidence_interval_upper": 7.5
    }
  ],
  "winner": {
    "provider": "superwall",
    "improvement_percent": 33.3,
    "confidence_level": 0.95,
    "recommendation": "Superwall is performing significantly better with 95% confidence. Consider increasing its weight."
  }
}
```

---

### **7. Cohort Analysis** (Web Dashboard)

#### **GET /api/v1/analytics/paywall/cohorts**
Fetch cohort analysis data.

**Query Parameters:**
- `limit` (optional): Number of weeks to return (1-52, default: 12)
- `provider` (optional): `all` | `superwall` | `revenuecat`
- `platform` (optional): `all` | `ios` | `android` | `web` | `expo`

**Response:**
```json
{
  "cohorts": [
    {
      "cohort_week": "2025-11-11T00:00:00Z",
      "provider": "revenuecat",
      "platform": "ios",
      "cohort_size": 150,
      "week_0_impressions": 450,
      "week_0_conversions": 45,
      "week_0_conversion_rate": 10.0,
      "week_0_revenue": 450.00,
      "week_1_impressions": 120,
      "week_1_conversions": 12,
      "week_1_conversion_rate": 10.0,
      "week_1_revenue": 120.00,
      "week_2_impressions": 80,
      "week_2_conversions": 8,
      "week_2_conversion_rate": 10.0,
      "week_2_revenue": 80.00,
      "week_3_impressions": 60,
      "week_3_conversions": 6,
      "week_3_conversion_rate": 10.0,
      "week_3_revenue": 60.00
    }
  ],
  "summary": {
    "total_cohorts": 12,
    "avg_week_0_conversion_rate": 9.5,
    "avg_week_1_retention": 85.0,
    "avg_week_2_retention": 70.0,
    "avg_week_3_retention": 55.0
  }
}
```

#### **POST /api/v1/analytics/paywall/cohorts**
Refresh the materialized view (admin only).

---

### **8. CSV Export** (Web Dashboard)

#### **GET /api/v1/analytics/paywall/export**
Download analytics as CSV.

**Query Parameters:**
- `start_date` (required): ISO 8601 date
- `end_date` (required): ISO 8601 date
- `provider` (optional): `all` | `superwall` | `revenuecat`
- `platform` (optional): `all` | `ios` | `android` | `web` | `expo`

**Response:**
```csv
date,provider,platform,event_type,count,revenue_usd
2025-11-14,superwall,ios,impression,150,0
2025-11-14,superwall,ios,conversion,12,120.00
2025-11-14,revenuecat,android,impression,140,0
2025-11-14,revenuecat,android,conversion,11,110.00
```

---

## 📱 **Mobile App Integration**

### **Step-by-Step Implementation**

#### **1. Install SDKs**

**For iOS (Swift):**
```bash
# Using CocoaPods
pod 'Superwall'
pod 'RevenueCat'

# Or SPM
dependencies: [
    .package(url: "https://github.com/superwall-me/Superwall-iOS", from: "3.0.0"),
    .package(url: "https://github.com/RevenueCat/purchases-ios", from: "4.0.0")
]
```

**For Android (Kotlin):**
```gradle
dependencies {
    implementation 'com.superwall.sdk:superwall-android:1.0.0'
    implementation 'com.revenuecat.purchases:purchases:6.0.0'
}
```

**For Expo/React Native:**
```bash
npm install @superwall/react-native-superwall
npm install react-native-purchases
```

---

#### **2. Fetch Config on App Launch**

```typescript
// helpers/paywall.ts
import { Platform } from 'react-native';
import Superwall from '@superwall/react-native-superwall';
import Purchases from 'react-native-purchases';

export async function initializePaywall(userToken: string) {
  try {
    // 1. Fetch config from backend
    const platform = Platform.OS === 'ios' ? 'ios' : 
                    Platform.OS === 'android' ? 'android' : 'expo';
    
    const response = await fetch(
      `https://ever-reach-be.vercel.app/api/v1/config/paywall-unified?platform=${platform}`,
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status}`);
    }
    
    const config = await response.json();
    
    // 2. Initialize the assigned provider
    const provider = config.active_provider;
    
    if (provider === 'superwall' && config.superwall.enabled) {
      const apiKey = Platform.OS === 'ios' 
        ? config.superwall.ios_key 
        : config.superwall.android_key;
      
      await Superwall.configure(apiKey);
      console.log('✅ Superwall initialized');
      
    } else if (provider === 'revenuecat' && config.revenuecat.enabled) {
      const apiKey = Platform.OS === 'ios' 
        ? config.revenuecat.ios_key 
        : config.revenuecat.android_key;
      
      Purchases.configure({ apiKey });
      console.log('✅ RevenueCat initialized');
    }
    
    return { provider, config };
    
  } catch (error) {
    console.error('Failed to initialize paywall:', error);
    // Fallback to RevenueCat if config fetch fails
    return { provider: 'revenuecat', config: null };
  }
}
```

---

#### **3. Show Paywall**

```typescript
// screens/PaywallScreen.tsx
import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { initializePaywall } from '@/helpers/paywall';

export function PaywallScreen() {
  const { session } = useAuth();
  
  useEffect(() => {
    async function setup() {
      const { provider } = await initializePaywall(session.access_token);
      
      if (provider === 'superwall') {
        Superwall.register('launch_paywall');
      } else {
        // RevenueCat
        const offerings = await Purchases.getOfferings();
        // Show RevenueCat paywall UI
      }
    }
    
    setup();
  }, []);
  
  return (
    <View>
      {/* Your paywall UI */}
    </View>
  );
}
```

---

#### **4. Event Tracking (Automatic)**

**Good news:** Events are tracked automatically via webhooks!
- Superwall sends webhooks to `/api/v1/webhook/superwall`
- RevenueCat sends webhooks to `/api/v1/webhook/revenuecat`
- Backend stores events in `unified_paywall_events` table
- No client-side tracking code needed! ✅

---

## 🌐 **Web App Integration**

### **Dashboard Pages to Build**

#### **1. Analytics Dashboard**
```typescript
// pages/paywall/analytics.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function PaywallAnalytics() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  
  const { data, isLoading } = useQuery({
    queryKey: ['paywall-analytics', dateRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/analytics/paywall?` +
        `start_date=${dateRange.start.toISOString().split('T')[0]}` +
        `&end_date=${dateRange.end.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      return response.json();
    },
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Paywall Analytics</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Impressions" value={data.summary.total_impressions} />
        <KPICard title="Conversions" value={data.summary.total_conversions} />
        <KPICard title="Conversion Rate" value={`${data.summary.conversion_rate}%`} />
        <KPICard title="Revenue" value={`$${data.summary.total_revenue}`} />
      </div>
      
      {/* Chart */}
      <LineChart data={data.by_day} />
      
      {/* Top Placements Table */}
      <PlacementsTable data={data.top_placements} />
    </div>
  );
}
```

#### **2. Reports Management Page** ✅
**Already built!** `dashboard-app/src/app/(external)/paywall-reports/page.tsx`

#### **3. Alerts Management Page** (To Build)
Similar structure to reports page with:
- List all alerts
- Create/edit alert modal
- Enable/disable toggle
- Delete confirmation

#### **4. A/B Test Results Page** (To Build)
- Show statistical significance
- Display confidence intervals
- Winner recommendation
- Date range selector

#### **5. Cohort Analysis Page** (To Build)
- Cohort table (week 0-3)
- Retention curves chart
- Provider/platform filters

---

## 🧪 **Test Results**

### **Complete Test Coverage: 45/45 (100%)**

#### **Config Endpoint Tests (16/16)**
✅ GET without auth returns 401  
✅ GET without platform returns 400  
✅ GET with invalid platform returns 400  
✅ GET with no config returns default (RevenueCat)  
✅ POST creates new config (RevenueCat only)  
✅ GET returns saved config (RevenueCat, iOS platform)  
✅ GET returns platform-specific keys (Android)  
✅ GET returns platform-specific keys (Web)  
✅ POST creates config with both providers  
✅ POST enables A/B test with valid weights  
✅ GET with A/B test shows assignment  
✅ POST with invalid weights returns 400  
✅ POST without required fields returns 400  
✅ POST with invalid provider returns 400  
✅ Web platform always returns RevenueCat  
✅ Deterministic A/B assignment (same user, same provider)  

#### **Advanced Features Tests (29/29)**
✅ Reports: Create daily report subscription  
✅ Reports: Create weekly report subscription  
✅ Reports: Create monthly report subscription  
✅ Reports: Validate required fields  
✅ Reports: List user subscriptions  
✅ Reports: Update subscription  
✅ Reports: Delete subscription  
✅ Alerts: Create conversion rate drop alert  
✅ Alerts: Create revenue drop alert  
✅ Alerts: Create no conversions alert  
✅ Alerts: Create high dismissal rate alert  
✅ Alerts: Validate threshold required for drop alerts  
✅ Alerts: List user alerts  
✅ Alerts: Update alert  
✅ Alerts: Delete alert  
✅ A/B Stats: Calculate significance with test data  
✅ A/B Stats: Custom confidence level  
✅ A/B Stats: Invalid confidence level validation  
✅ A/B Stats: Date range filtering  
✅ Cohorts: Fetch cohort analysis  
✅ Cohorts: Filter by provider  
✅ Cohorts: Filter by platform  
✅ Cohorts: Custom limit  
✅ Cohorts: Refresh materialized view  
✅ CSV Export: Download analytics as CSV  
✅ Authorization: Require auth for reports  
✅ Authorization: Require auth for alerts  
✅ Authorization: Require auth for A/B stats  
✅ Authorization: Require auth for cohorts  

---

## 🗄️ **Database Schema**

### **Tables (5)**
1. **paywall_providers** - Configuration storage
2. **unified_paywall_events** - Event log (all providers)
3. **ab_test_results** - A/B test tracking
4. **paywall_report_subscriptions** - Email report config
5. **paywall_alerts** - Conversion alert config

### **Materialized View (1)**
- **paywall_cohort_analysis** - Pre-aggregated cohort data

### **Functions (8)**
- `get_active_paywall_provider(user_id)` - Returns assigned provider
- `calculate_ab_test_stats(user_id, test_name)` - Basic A/B metrics
- `calculate_ab_test_significance(...)` - Statistical analysis
- `refresh_cohort_analysis()` - Refresh materialized view
- `is_alert_in_cooldown(alert_id)` - Check cooldown status
- `calculate_next_report_send_time(subscription_id)` - Schedule next send
- `calculate_next_report_send_time_direct(...)` - Trigger version
- `update_report_next_send()` - Trigger function

---

## 🔒 **Security & Authentication**

### **All endpoints require authentication:**
```typescript
headers: {
  'Authorization': `Bearer ${userToken}`,
}
```

### **Get User Token:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://utasetfxiqcrnwyfforx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

// After login
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;
```

---

## 📝 **Implementation Checklist**

### **Mobile App**
- [ ] Install Superwall SDK
- [ ] Install RevenueCat SDK
- [ ] Create `paywall.ts` helper
- [ ] Add config fetch on app launch
- [ ] Initialize assigned provider
- [ ] Show paywall on appropriate screens
- [ ] Test with real user account
- [ ] Verify webhooks are working

### **Web App**
- [ ] Build analytics dashboard
- [ ] Build alerts management page
- [ ] Build A/B test results page
- [ ] Build cohort analysis page
- [ ] Add React Query for data fetching
- [ ] Add charts library (Recharts recommended)
- [ ] Test all CRUD operations
- [ ] Verify CSV export

---

## 🚀 **Production Deployment**

### **Backend** (Already Done)
✅ Database migrations applied  
✅ All endpoints working  
✅ Tests passing  
⚠️ Need to optimize cron jobs (22 → 20)  

### **Environment Variables Needed**
```bash
# Required
SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
CRON_SECRET=<64_hex_chars>
RESEND_API_KEY=re_<key>

# Optional (Provider Setup)
SUPERWALL_WEBHOOK_SECRET=<64_hex>
SUPERWALL_IOS_KEY=pk_prod_<key>
SUPERWALL_ANDROID_KEY=pk_prod_<key>
REVENUECAT_WEBHOOK_SECRET=<64_hex>
REVENUECAT_IOS_KEY=appl_<key>
REVENUECAT_ANDROID_KEY=goog_<key>
REVENUECAT_WEB_KEY=rcb_<key>
REVENUECAT_STRIPE_KEY=pk_live_<key>
```

---

## 🆘 **Support & Troubleshooting**

### **Common Issues**

**1. Config returns 401**
- Check user token is valid
- Verify token is passed in Authorization header

**2. Config returns 404**
- Endpoint might not be deployed yet
- Check backend URL is correct

**3. Events not appearing in analytics**
- Verify webhooks are configured in provider dashboard
- Check webhook secret matches environment variable
- Look at backend logs for webhook errors

**4. A/B test not working**
- Check `ab_test_enabled` is true in config
- Verify weights sum to 100
- Confirm test dates are active

---

## 📚 **Additional Documentation**

1. **PAYWALL_CONFIG_TESTING_PLAN.md** - Config endpoint testing
2. **PAYWALL_WEBHOOKS_GUIDE.md** - Webhook setup & event mapping
3. **PAYWALL_ANALYTICS_DASHBOARD.md** - Dashboard features
4. **MOBILE_PAYWALL_INTEGRATION_GUIDE.md** - Complete mobile guide
5. **MOBILE_PAYWALL_QUICKSTART.md** - Quick mobile guide
6. **MOBILE_PAYWALL_API_CHEATSHEET.md** - API reference
7. **PROVIDER_SETUP_GUIDE.md** - Superwall/RevenueCat setup
8. **PAYWALL_ADVANCED_FEATURES_TESTS.md** - Test documentation
9. **PAYWALL_DEPLOYMENT_GUIDE.md** - Deployment steps
10. **PAYWALL_SYSTEM_COMPLETE.md** - Complete system summary

---

**Status**: ✅ **READY FOR IMPLEMENTATION**  
**Backend**: https://ever-reach-be.vercel.app  
**Last Updated**: November 15, 2025  
**Version**: 1.0.0
