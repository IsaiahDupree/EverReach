# User Goals System - Phase 1 Complete ✅

**Date**: October 13, 2025  
**Branch**: feat/backend-vercel-only-clean  
**Status**: Ready for Migration & Testing

---

## 📋 Overview

A complete goal management system that allows users to define their personal, business, and networking objectives. These goals inform AI suggestions, message generation, and contact analysis throughout the platform.

---

## 🗄️ Database Schema

### **Tables Created (2)**

#### 1. `user_goals`
Main goals storage table.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- goal_category (VARCHAR) - 'business', 'networking', 'personal'
- goal_text (TEXT, required) - The goal itself
- goal_description (TEXT, optional) - Detailed description
- priority (VARCHAR) - 'high', 'medium', 'low'
- is_active (BOOLEAN) - Active/archived status
- target_date (DATE, optional) - Goal deadline
- target_count (INTEGER, optional) - Numeric target
- current_progress (INTEGER) - Progress toward target
- tags (TEXT[]) - Categorization tags
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Indexes:**
- `idx_user_goals_user` - Fast user lookups
- `idx_user_goals_active` - Filter active goals by priority
- `idx_user_goals_category` - Category-based queries
- `idx_user_goals_updated` - Recent goals first

**RLS Policies:** ✅ Enabled  
Users can only view/manage their own goals.

---

#### 2. `goal_contact_associations`
Links goals to specific contacts.

```sql
Columns:
- id (UUID, PK)
- goal_id (UUID, FK → user_goals)
- contact_id (UUID, FK → contacts)
- user_id (UUID, FK → auth.users)
- relevance_score (INTEGER, 1-10) - How relevant is this contact to the goal
- notes (TEXT) - Association context
- created_at (TIMESTAMPTZ)
```

**Indexes:**
- `idx_goal_contact_goal` - Find contacts for a goal
- `idx_goal_contact_contact` - Find goals for a contact
- `idx_goal_contact_user` - User-scoped queries

**RLS Policies:** ✅ Enabled

---

### **Views Created (1)**

#### `user_goals_summary`
Aggregated stats per user and category.

```sql
Returns:
- user_id
- goal_category
- total_goals
- active_goals
- high_priority_count
- avg_progress
```

---

## 🔌 API Endpoints

### **Base Path:** `/v1/me/goals`

---

### 1. **GET /v1/me/goals** - List Goals

**Description:** Get all goals for authenticated user with filtering.

**Query Parameters:**
- `category` (optional) - Filter by: business, networking, personal
- `active` (optional) - Filter by: true, false
- `priority` (optional) - Filter by: high, medium, low
- `limit` (optional) - Max results (default: 50)

**Response:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "goal_category": "networking",
      "goal_text": "Connect with 10 CTOs in Q4",
      "goal_description": "Focus on SaaS companies in Austin",
      "priority": "high",
      "is_active": true,
      "target_date": "2025-12-31",
      "target_count": 10,
      "current_progress": 3,
      "tags": ["saas", "cto", "austin"],
      "created_at": "2025-10-01T00:00:00Z",
      "updated_at": "2025-10-13T00:00:00Z"
    }
  ],
  "total": 5,
  "summary": [
    {
      "goal_category": "networking",
      "total_goals": 3,
      "active_goals": 2,
      "high_priority_count": 1,
      "avg_progress": 30
    }
  ]
}
```

---

### 2. **POST /v1/me/goals** - Create Goal

**Description:** Create a new goal.

**Request Body:**
```json
{
  "goal_category": "business",
  "goal_text": "Close 5 enterprise deals this quarter",
  "goal_description": "Focus on Fortune 500 companies",
  "priority": "high",
  "is_active": true,
  "target_date": "2025-12-31",
  "target_count": 5,
  "tags": ["sales", "enterprise", "q4"]
}
```

**Response:**
```json
{
  "goal": { /* created goal object */ },
  "message": "Goal created successfully"
}
```

---

### 3. **GET /v1/me/goals/:id** - Get Single Goal

**Description:** Get detailed information about a specific goal including associated contacts.

**Response:**
```json
{
  "goal": { /* goal object */ },
  "associated_contacts": [
    {
      "id": "uuid",
      "contact_id": "uuid",
      "relevance_score": 8,
      "notes": "Key decision maker",
      "contacts": {
        "id": "uuid",
        "display_name": "Jane Smith",
        "warmth": 75
      }
    }
  ]
}
```

---

### 4. **PATCH /v1/me/goals/:id** - Update Goal

**Description:** Update goal fields (partial update supported).

**Request Body:**
```json
{
  "current_progress": 4,
  "priority": "medium",
  "is_active": false
}
```

**Response:**
```json
{
  "goal": { /* updated goal object */ },
  "message": "Goal updated successfully"
}
```

---

### 5. **DELETE /v1/me/goals/:id** - Delete Goal

**Description:** Permanently delete a goal (also removes associations).

**Response:**
```json
{
  "message": "Goal deleted successfully"
}
```

---

### 6. **GET /v1/me/goals/:id/contacts** - List Associated Contacts

**Description:** Get all contacts associated with this goal.

**Response:**
```json
{
  "goal": {
    "id": "uuid",
    "goal_text": "Connect with CTOs"
  },
  "associations": [
    {
      "id": "uuid",
      "contact_id": "uuid",
      "relevance_score": 9,
      "notes": "Perfect fit - SaaS CTO",
      "contacts": { /* full contact object */ }
    }
  ],
  "total": 3
}
```

---

### 7. **POST /v1/me/goals/:id/contacts** - Associate Contact

**Description:** Link a contact to a goal.

**Request Body:**
```json
{
  "contact_id": "uuid",
  "relevance_score": 8,
  "notes": "Met at conference, interested in partnership"
}
```

**Response:**
```json
{
  "association": { /* association object */ },
  "message": "Contact associated with goal successfully"
}
```

---

### 8. **DELETE /v1/me/goals/:id/contacts?contact_id=uuid** - Remove Association

**Description:** Remove contact association from goal.

**Query Parameters:**
- `contact_id` (required) - Contact to remove

**Response:**
```json
{
  "message": "Contact association removed successfully"
}
```

---

## 🎯 Use Cases

### **Example 1: Networking Goal**
```json
{
  "goal_category": "networking",
  "goal_text": "Attend 3 industry events and connect with 20 people",
  "target_count": 20,
  "priority": "high",
  "tags": ["events", "community", "growth"]
}
```

### **Example 2: Business Goal**
```json
{
  "goal_category": "business",
  "goal_text": "Generate 50 qualified leads for Q4",
  "goal_description": "Focus on enterprise B2B SaaS companies",
  "target_date": "2025-12-31",
  "target_count": 50,
  "priority": "high"
}
```

### **Example 3: Personal Goal**
```json
{
  "goal_category": "personal",
  "goal_text": "Strengthen relationships with 10 mentors",
  "goal_description": "Monthly check-ins with career advisors",
  "target_count": 10,
  "priority": "medium",
  "tags": ["mentorship", "career", "growth"]
}
```

---

## 🤖 AI Integration Points

Goals will be used in:

### **1. Contact Analysis** (`/v1/agent/analyze/contact`)
```typescript
// AI prompt includes:
"User's Active Goals:
- [networking] Connect with 10 CTOs in Q4 (high priority)
- [business] Close 5 enterprise deals (high priority)

Analyze how this contact relates to user's goals."
```

### **2. Message Composition** (`/v1/agent/compose`)
```typescript
// AI prompt includes:
"Relevant Goals for this contact:
- Associated with goal: 'Connect with CTOs' (relevance: 9/10)

Craft message that advances this goal."
```

### **3. Action Suggestions** (`/v1/agent/suggest/actions`)
```typescript
// AI considers:
"User Goals: networking=2 active, business=3 active
Suggest actions that help achieve these goals."
```

### **4. Goal-Specific Suggestions** (Phase 2 - `/v1/contacts/:id/goal-suggestions`)
```typescript
// NEW endpoint will use:
"Contact: John Doe (warmth=45, last_touch=14d)
User Goal: 'Connect with 10 CTOs' (3/10 progress)
Suggest: 'Re-engage John to hit your CTO networking goal'"
```

---

## 📁 Files Created

```
backend-vercel/
├── db/
│   └── user-goals-system.sql                    (150 lines)
│
├── app/api/v1/me/goals/
│   ├── route.ts                                 (150 lines) - GET, POST
│   ├── [id]/
│   │   ├── route.ts                            (180 lines) - GET, PATCH, DELETE
│   │   └── contacts/
│   │       └── route.ts                        (210 lines) - GET, POST, DELETE
│
└── docs/
    └── USER_GOALS_SYSTEM.md                     (this file)
```

**Total:** 4 API files + 1 migration + 1 doc = ~690 lines

---

## 🚀 Deployment Steps

### **1. Run Migration**
```bash
cd backend-vercel
psql $DATABASE_URL -f db/user-goals-system.sql
```

### **2. Verify Tables**
```sql
SELECT * FROM user_goals LIMIT 1;
SELECT * FROM goal_contact_associations LIMIT 1;
SELECT * FROM user_goals_summary;
```

### **3. Test API Endpoints**

**Create a goal:**
```bash
curl -X POST https://ever-reach-be.vercel.app/v1/me/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goal_category": "networking",
    "goal_text": "Connect with 10 CTOs",
    "priority": "high",
    "target_count": 10
  }'
```

**List goals:**
```bash
curl https://ever-reach-be.vercel.app/v1/me/goals?category=networking \
  -H "Authorization: Bearer $TOKEN"
```

**Update progress:**
```bash
curl -X PATCH https://ever-reach-be.vercel.app/v1/me/goals/$GOAL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_progress": 3}'
```

---

## ✅ Phase 1 Complete

### **What's Working:**
- ✅ Database schema with RLS
- ✅ CRUD operations for goals
- ✅ Goal-contact associations
- ✅ Filtering and querying
- ✅ Summary statistics
- ✅ Full API endpoints

### **Next Steps (Phase 2):**
1. Enhance `/v1/contacts/:id/goal-suggestions` with AI
2. Integrate goals into agent prompts
3. Build frontend goal management UI
4. Add progress tracking automation

---

## 🧪 Testing Checklist

- [ ] Create goal (all 3 categories)
- [ ] List goals with filters
- [ ] Update goal progress
- [ ] Archive/activate goal
- [ ] Delete goal
- [ ] Associate contact with goal
- [ ] Remove contact association
- [ ] Verify RLS (can't access other users' goals)
- [ ] Test summary view
- [ ] Test validation errors

---

## 📊 Sample Data (for testing)

```sql
-- Insert test goals
INSERT INTO user_goals (user_id, goal_category, goal_text, priority, target_count, is_active)
VALUES
  (auth.uid(), 'networking', 'Connect with 10 CTOs this quarter', 'high', 10, true),
  (auth.uid(), 'business', 'Close 5 enterprise deals', 'high', 5, true),
  (auth.uid(), 'personal', 'Strengthen mentorship relationships', 'medium', 5, true);
```

---

**🎉 Phase 1 Complete - Ready for Phase 2!**
