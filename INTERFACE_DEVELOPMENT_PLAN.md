# 🎨 Interface Development Plan

**Phase**: Post-Seed Data Testing & UI Development  
**Status**: Ready to begin after seed data verification

---

## 📋 Interfaces to Develop

### **1. Marketing Intelligence Dashboard** (Priority 1)

**Components**:
- Attribution Analytics Chart
- Magnetism Score Display
- Persona Distribution Pie Chart
- Funnel Visualization
- Real-time KPI Cards

**API Integration**:
- `/api/v1/marketing/attribution`
- `/api/v1/marketing/magnetism`
- `/api/v1/marketing/personas`
- `/api/v1/marketing/funnel`
- `/api/v1/marketing/analytics`

**Technology**: React + Recharts/Chart.js + TailwindCSS

---

### **2. Social Platform Integrations Dashboard** (Priority 2)

**Components**:
- WhatsApp Message Sender
- Instagram Stats Cards
- Facebook Ads Campaign Manager
- Multi-platform Analytics

**API Integration**:
- `/api/v1/integrations/whatsapp/send`
- `/api/v1/integrations/instagram/stats`
- `/api/v1/integrations/facebook-ads/campaigns`

**Technology**: React + TailwindCSS + Lucide Icons

---

### **3. User Activity Timeline** (Priority 3)

**Components**:
- Event Timeline Visualization
- Engagement Heatmap
- Intent Score Tracker
- Activity Insights

**API Integration**:
- Query `user_event` table
- Real-time updates via Supabase subscriptions

**Technology**: React + Timeline Component + Supabase Realtime

---

## 🧪 Testing Plan (After Seed Data)

### **Test 1: Verify Data in Database**

```sql
-- Check user events
SELECT COUNT(*) FROM user_event;  -- Should be 19

-- Check magnetism index
SELECT * FROM user_magnetism_index ORDER BY computed_at DESC LIMIT 1;

-- Check attribution view
SELECT * FROM vw_last_touch_before_conversion LIMIT 5;
```

### **Test 2: Test Marketing Intelligence APIs**

Run comprehensive test suite:
```bash
.\test\agent\run-comprehensive-tests.ps1
```

Expected: **12-13 tests passing (85-92%)**

### **Test 3: Test Individual Endpoints**

```bash
# Attribution
curl "https://backend-vercel-19y0hqopd-isaiahduprees-projects.vercel.app/api/v1/marketing/attribution" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Magnetism
curl "https://backend-vercel-19y0hqopd-isaiahduprees-projects.vercel.app/api/v1/marketing/magnetism" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Personas
curl "https://backend-vercel-19y0hqopd-isaiahduprees-projects.vercel.app/api/v1/marketing/personas" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Funnel
curl "https://backend-vercel-19y0hqopd-isaiahduprees-projects.vercel.app/api/v1/marketing/funnel" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Analytics
curl "https://backend-vercel-19y0hqopd-isaiahduprees-projects.vercel.app/api/v1/marketing/analytics" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎨 Interface Development Structure

### **Directory Structure**

```
frontend/
├── src/
│   ├── components/
│   │   ├── marketing/
│   │   │   ├── AttributionChart.tsx
│   │   │   ├── MagnetismDisplay.tsx
│   │   │   ├── PersonaChart.tsx
│   │   │   ├── FunnelVisualization.tsx
│   │   │   └── KPICards.tsx
│   │   ├── social/
│   │   │   ├── WhatsAppSender.tsx
│   │   │   ├── InstagramStats.tsx
│   │   │   └── FacebookAdsManager.tsx
│   │   └── timeline/
│   │       ├── EventTimeline.tsx
│   │       └── EngagementHeatmap.tsx
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── marketing.tsx
│   │   │   ├── social.tsx
│   │   │   └── analytics.tsx
│   └── hooks/
│       ├── useMarketingData.ts
│       ├── useSocialIntegrations.ts
│       └── useUserEvents.ts
```

---

## 🚀 Implementation Steps

### **Step 1: Marketing Intelligence Dashboard** (1-2 hours)

1. Create dashboard layout
2. Implement KPI cards
3. Add attribution chart (bar chart)
4. Add persona distribution (pie chart)
5. Add funnel visualization (funnel/sankey)
6. Add magnetism score display
7. Connect to APIs
8. Add loading & error states

### **Step 2: Social Platform Dashboard** (1-2 hours)

1. Create social dashboard layout
2. WhatsApp message sender form
3. Instagram stats display cards
4. Facebook Ads campaign list
5. Campaign creation form
6. Connect to APIs
7. Add success/error notifications

### **Step 3: User Activity Timeline** (1 hour)

1. Create timeline component
2. Fetch user events
3. Display chronological timeline
4. Add event type badges
5. Add engagement metrics
6. Implement real-time updates

---

## 🎨 Design System

### **Colors**
- Primary: #3B82F6 (Blue)
- Success: #10B981 (Green)
- Warning: #F59E0B (Orange)
- Error: #EF4444 (Red)
- Gray: #6B7280

### **Components**
- **shadcn/ui** for base components
- **Lucide** for icons
- **Recharts** for charts
- **TailwindCSS** for styling

---

## 📊 Marketing Dashboard Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Marketing Intelligence Dashboard                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐      │
│  │ Total │  │ Conv  │  │ Avg   │  │ High  │      │
│  │ Users │  │ Rate  │  │Magnet │  │ Engage│      │
│  └───────┘  └───────┘  └───────┘  └───────┘      │
│                                                     │
│  ┌─────────────────────┐  ┌──────────────────┐    │
│  │  Attribution        │  │  Persona Dist    │    │
│  │  (Bar Chart)        │  │  (Pie Chart)     │    │
│  │                     │  │                  │    │
│  └─────────────────────┘  └──────────────────┘    │
│                                                     │
│  ┌──────────────────────────────────────────┐     │
│  │  Conversion Funnel                       │     │
│  │  (Funnel Chart)                          │     │
│  └──────────────────────────────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔌 API Integration Patterns

### **Custom Hook Example**

```typescript
// hooks/useMarketingData.ts
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export function useMarketingAttribution(filters?: {
  start_date?: string;
  end_date?: string;
  source?: string;
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAttribution() {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        const params = new URLSearchParams(filters);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/marketing/attribution?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAttribution();
  }, [filters]);

  return { data, loading, error };
}
```

---

## ✅ Development Checklist

### **Pre-Development**
- [x] Backend APIs deployed
- [x] Database schema migrated
- [ ] **Sample data seeded** ← NEXT STEP
- [ ] APIs tested and returning data

### **Marketing Dashboard**
- [ ] Layout & routing
- [ ] KPI cards component
- [ ] Attribution chart
- [ ] Persona distribution chart
- [ ] Funnel visualization
- [ ] Magnetism display
- [ ] API integration
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design

### **Social Dashboard**
- [ ] Layout & routing
- [ ] WhatsApp sender component
- [ ] Instagram stats component
- [ ] Facebook Ads manager
- [ ] Campaign creation form
- [ ] API integration
- [ ] Success notifications
- [ ] Error handling

### **User Timeline**
- [ ] Timeline component
- [ ] Event fetching
- [ ] Real-time updates
- [ ] Event filters
- [ ] Engagement metrics

---

## 🎯 Success Criteria

**Marketing Dashboard**:
- ✅ Displays all KPI metrics
- ✅ Charts render correctly
- ✅ Data refreshes on filter change
- ✅ Mobile responsive
- ✅ Loads in <2 seconds

**Social Dashboard**:
- ✅ Can send WhatsApp messages
- ✅ Displays Instagram stats
- ✅ Can create Facebook campaigns
- ✅ Shows success/error feedback
- ✅ Mobile responsive

**User Timeline**:
- ✅ Shows all user events
- ✅ Updates in real-time
- ✅ Filterable by event type
- ✅ Shows engagement trends

---

*Ready to begin after seed data verification*  
*Estimated total development time: 4-5 hours*  
*Expected completion: Same day*
