# Mobile App Admin & Management Features Plan

**Date**: October 21, 2025  
**Goal**: Add admin/management capabilities to EverReach mobile CRM

---

## 🎯 Overview

Transform the mobile app into a complete admin-capable CRM with:
- **User Management** - Team collaboration features
- **Organization Settings** - Manage workspace settings
- **Analytics Dashboard** - Personal usage insights
- **Feature Access** - See enabled features & experiments
- **Data Management** - Export, backup, cleanup
- **Billing Management** - Subscription control

---

## 📱 Admin Features for Mobile

### 1. **Organization Settings** (Priority: HIGH)

**Screen**: `app/admin/organization.tsx`

**Features**:
- Organization name & logo
- Team size & members
- Billing tier display
- Data retention settings
- Export preferences
- Privacy settings

**API Endpoints Needed**:
- `GET /v1/organization` - Get org details
- `PATCH /v1/organization` - Update org settings
- `GET /v1/organization/members` - List team members
- `POST /v1/organization/invite` - Invite team member

**UI Components**:
```tsx
// components/admin/OrganizationCard.tsx
- Display org info
- Edit org name/logo
- Member count badge
- Settings quick actions

// components/admin/TeamMembersList.tsx
- List all team members
- Show roles (admin, member, viewer)
- Invite button
- Remove member action
```

---

### 2. **Personal Analytics Dashboard** (Priority: HIGH)

**Screen**: `app/admin/analytics.tsx`

**Metrics to Show**:
- **Usage Stats**:
  - Total contacts added
  - Interactions logged this week/month
  - Messages sent (total & by channel)
  - Average warmth score
  - Contacts by warmth band (pie chart)
  
- **Activity Timeline**:
  - Daily active contacts
  - Interaction frequency graph
  - Message sending patterns
  
- **AI Usage**:
  - AI messages generated
  - AI analysis runs
  - Screenshot analyses
  - Voice notes processed

**API Endpoints**:
- `GET /v1/analytics/summary` - Overall stats
- `GET /v1/analytics/activity` - Daily/weekly activity
- `GET /v1/analytics/ai-usage` - AI feature usage

**UI Components**:
```tsx
// components/admin/AnalyticsCard.tsx
- Stat display with icon
- Trend indicator (up/down)
- Time period selector

// components/admin/ActivityChart.tsx
- Line/bar chart for trends
- Interactive tooltips
- Date range picker

// components/admin/WarmthDistribution.tsx
- Pie chart of warmth bands
- Count badges
- Tap to filter contacts
```

---

### 3. **Feature Access & Experiments** (Priority: MEDIUM)

**Screen**: `app/admin/features.tsx`

**What to Show**:
- **Active Feature Flags**:
  - Which features are enabled for this user
  - Rollout percentage
  - Feature description
  
- **Active Experiments**:
  - Which A/B tests user is in
  - Variant assigned
  - Experiment description

- **Tier Features**:
  - Current plan features
  - Upgrade prompts for locked features

**API Endpoints**:
- `GET /v1/features/active` - Features enabled for user
- `GET /v1/experiments/assignments` - User's experiment variants
- `GET /v1/me/entitlements` - Current plan entitlements (existing)

**UI Components**:
```tsx
// components/admin/FeatureFlagCard.tsx
- Feature name & icon
- Enabled status badge
- Description
- "Learn More" link

// components/admin/ExperimentBadge.tsx
- Experiment name
- Variant label (A/B)
- Optional feedback button
```

---

### 4. **Data Management** (Priority: HIGH)

**Screen**: `app/admin/data.tsx`

**Features**:
- **Export Data**:
  - Export all contacts (CSV/JSON)
  - Export interactions (CSV)
  - Export warmth history
  - Schedule automatic exports
  
- **Storage Usage**:
  - Screenshots storage (MB used)
  - Voice notes storage
  - Total data size
  - Cleanup old data option

- **Data Cleanup**:
  - Delete old interactions (>1 year)
  - Clean up orphaned screenshots
  - Archive cold contacts

**API Endpoints**:
- `POST /v1/export/contacts` - Export contacts
- `POST /v1/export/interactions` - Export interactions
- `GET /v1/storage/usage` - Storage breakdown
- `DELETE /v1/data/cleanup` - Cleanup old data

**UI Components**:
```tsx
// components/admin/ExportButton.tsx
- Export type selector
- Format picker (CSV/JSON)
- Download progress
- Success notification

// components/admin/StorageCard.tsx
- Storage breakdown chart
- Used vs available
- Cleanup suggestions
```

---

### 5. **Subscription & Billing** (Priority: HIGH)

**Screen**: `app/admin/billing.tsx`

**Features**:
- **Current Plan**:
  - Plan name & tier
  - Features included
  - Usage limits (contacts, messages, AI calls)
  - Next billing date
  
- **Usage Tracking**:
  - Contacts: 450/500 (90%)
  - AI messages: 120/200 (60%)
  - Screenshot analyses: 45/100 (45%)
  - Progress bars with colors

- **Manage Subscription**:
  - Upgrade/downgrade
  - Cancel subscription
  - Update payment method
  - View invoices

**API Endpoints**:
- `GET /v1/billing/subscription` - Current subscription
- `GET /v1/billing/usage` - Usage vs limits
- `POST /v1/billing/portal` - Stripe portal link
- `GET /v1/billing/invoices` - Invoice history

**UI Components**:
```tsx
// components/admin/PlanCard.tsx
- Plan badge (Pro, Free, etc.)
- Features list with checkmarks
- Upgrade button
- Manage link

// components/admin/UsageBar.tsx
- Progress bar with percentage
- Color coding (green < 70%, yellow 70-90%, red > 90%)
- Limit display

// components/admin/InvoiceList.tsx
- Invoice date, amount, status
- Download PDF button
- Payment method display
```

---

### 6. **Team Management** (Priority: MEDIUM)

**Screen**: `app/admin/team.tsx`

**Features**:
- **Team Members**:
  - List all members
  - Show roles (Owner, Admin, Member, Viewer)
  - Last active timestamp
  - Invite status (pending/active)

- **Invite Members**:
  - Email input
  - Role selector
  - Send invitation
  - Copy invite link

- **Permissions**:
  - View only
  - Edit contacts
  - Delete contacts
  - Manage billing
  - Invite members

**API Endpoints**:
- `GET /v1/team/members` - List members
- `POST /v1/team/invite` - Invite member
- `PATCH /v1/team/members/:id` - Update role
- `DELETE /v1/team/members/:id` - Remove member

**UI Components**:
```tsx
// components/admin/TeamMemberCard.tsx
- Avatar, name, email
- Role badge
- Last active timestamp
- Actions menu (edit role, remove)

// components/admin/InviteModal.tsx
- Email input with validation
- Role picker
- Custom message (optional)
- Send button
```

---

### 7. **App Settings & Preferences** (Priority: MEDIUM)

**Screen**: `app/admin/settings.tsx`

**Categories**:

**Notifications**:
- Push notification preferences
- Email digest frequency
- Warmth alerts settings
- Reminder preferences

**Privacy**:
- Analytics opt-in/out
- Data sharing preferences
- Screenshot auto-upload
- Voice note transcription

**Defaults**:
- Default interaction channel
- Default message tone
- Auto-recompute warmth
- Contact import settings

**Advanced**:
- API access token
- Webhook configuration
- Developer mode
- Debug logs

**API Endpoints**:
- `GET /v1/settings/preferences` - All preferences
- `PATCH /v1/settings/preferences` - Update preferences
- `POST /v1/settings/api-token` - Generate API token
- `GET /v1/settings/webhooks` - List webhooks

**UI Components**:
```tsx
// components/admin/SettingsSection.tsx
- Section header
- Setting rows with toggle/picker
- Description text

// components/admin/SettingRow.tsx
- Label & description
- Switch/Picker/Input
- Help icon with tooltip
```

---

### 8. **Debug & Support** (Priority: LOW)

**Screen**: `app/admin/debug.tsx`

**Features**:
- **System Info**:
  - App version & build number
  - Device info (OS, model)
  - Backend URL
  - Last sync timestamp

- **Diagnostics**:
  - Test backend connection
  - View recent errors
  - Export diagnostic logs
  - Clear cache

- **Support**:
  - Contact support (email)
  - Feature request
  - Bug report
  - Help documentation

**API Endpoints**:
- `GET /v1/health` - Backend health check
- `POST /v1/support/ticket` - Submit support ticket
- `GET /v1/debug/logs` - Recent error logs

**UI Components**:
```tsx
// components/admin/SystemInfoCard.tsx
- Version display
- Device info
- Copy info button

// components/admin/DiagnosticButton.tsx
- Test action
- Loading spinner
- Success/error indicator
```

---

## 📐 Navigation Structure

### Option A: Bottom Tab (Recommended)

```
Home | Contacts | AI Chat | Analytics | Settings
                                  ↑
                            Admin Features
```

Add **Analytics** tab to bottom navigation:
- Icon: 📊 chart icon
- Shows badge if usage > 90%
- Tapping opens analytics dashboard
- Settings moved to profile icon in header

### Option B: Settings Menu

Keep existing tabs, add Admin section in Settings:

```
Settings
├── Profile
├── Notifications
├── Privacy
├── ───────────
├── 👑 Admin & Analytics
│   ├── Organization
│   ├── Analytics Dashboard
│   ├── Feature Access
│   ├── Data Management
│   ├── Billing
│   ├── Team
│   └── Debug
└── ───────────
└── Help & Support
```

---

## 🎨 UI Design Guidelines

### Color Scheme
- **Admin sections**: Purple accent (#8B5CF6)
- **Analytics**: Blue (#3B82F6)
- **Billing**: Green (#10B981)
- **Warnings**: Yellow (#F59E0B)
- **Errors**: Red (#EF4444)

### Typography
- Section headers: 20px, semibold
- Card titles: 16px, medium
- Body text: 14px, regular
- Labels: 12px, medium, gray

### Components
- Use cards for grouping
- Bottom sheets for actions
- Haptic feedback on all interactions
- Skeleton loading states
- Empty states with illustrations

---

## 🔒 Security & Permissions

### Role-Based Access

**Owner**:
- ✅ All permissions
- ✅ Delete organization
- ✅ Manage billing
- ✅ Invite/remove members

**Admin**:
- ✅ View analytics
- ✅ Invite members
- ✅ Export data
- ❌ Manage billing
- ❌ Delete organization

**Member**:
- ✅ View own analytics
- ✅ Edit own contacts
- ❌ Invite members
- ❌ Export all data
- ❌ View billing

**Viewer**:
- ✅ View contacts
- ❌ Edit anything
- ❌ Export data

### Authentication
- Admin screens require re-auth if >5 min idle
- Biometric lock for billing/data export
- Session timeout after 30 min

---

## 📦 Implementation Plan

### Phase 1: Core Admin (Week 1)
- ✅ Analytics dashboard
- ✅ Billing & subscription
- ✅ Organization settings
- ✅ Navigation setup

### Phase 2: Data Management (Week 2)
- ✅ Data export
- ✅ Storage usage
- ✅ Cleanup tools
- ✅ Feature access view

### Phase 3: Team Features (Week 3)
- ✅ Team member management
- ✅ Invite flow
- ✅ Role-based permissions
- ✅ Settings & preferences

### Phase 4: Polish & Advanced (Week 4)
- ✅ Debug & support tools
- ✅ Advanced settings
- ✅ API token management
- ✅ Webhook configuration

---

## 📊 Success Metrics

- **Engagement**: >40% of users visit analytics weekly
- **Billing**: >60% understand their usage limits
- **Team**: >25% of Pro users invite team members
- **Export**: >15% of users export data
- **Support**: <5% support tickets about "where is X feature"

---

## 🔧 Technical Requirements

### Dependencies
```json
{
  "react-native-charts-wrapper": "^0.5.11",
  "react-native-svg": "^13.14.0",
  "react-native-chart-kit": "^6.12.0",
  "react-native-progress": "^5.0.0"
}
```

### New Hooks
- `useAnalytics()` - Fetch user analytics
- `useBilling()` - Subscription & usage
- `useTeam()` - Team members
- `useOrganization()` - Org settings
- `useFeatureFlags()` - Active features

### New Components (20+)
See component listings in each section above

---

## 🚀 Quick Start

### 1. Create Admin Directory Structure
```bash
mkdir -p app/admin
mkdir -p components/admin
mkdir -p hooks/admin
```

### 2. Add Admin Routes
- `app/admin/analytics.tsx`
- `app/admin/billing.tsx`
- `app/admin/organization.tsx`
- `app/admin/team.tsx`
- `app/admin/data.tsx`
- `app/admin/features.tsx`
- `app/admin/settings.tsx`
- `app/admin/debug.tsx`

### 3. Update Navigation
Add Analytics tab or Admin menu to existing navigation

### 4. Implement Hooks
Start with `useAnalytics()` and `useBilling()` as they're most critical

---

## 📋 Next Steps

1. **Review this plan** - Confirm features & priorities
2. **Choose navigation approach** - Tab vs Settings menu
3. **Design screens** - Create mockups/wireframes
4. **Implement Phase 1** - Analytics & billing
5. **Deploy & test** - Get user feedback

---

**Ready to start building?** Let me know which phase or feature you'd like to implement first!
