# AI Goal Inference System

**Invisible Intelligence Layer for Goal-Aware AI Responses**

## Overview

The AI Goal Inference System automatically discovers user goals from multiple sources and invisibly guides AI responses without explicit UI elements. Goals are inferred with confidence scores, weighted by source reliability, and injected into AI prompts to make suggestions more aligned with user objectives.

## Architecture

### **Hierarchy of Goal Sources (by weight)**

1. **Explicit Profile Fields (100% weight, 1.0 confidence)**
   - User sets goals directly in profile settings
   - Fields: `personal_goal`, `networking_goal`, `business_goal`
   - Highest trust, always takes precedence

2. **Explicit Mentions in Notes (80% weight, 0.85 confidence)**
   - Clear goal statements in persona notes
   - Examples: "My goal is...", "I want to...", "This quarter I will..."
   - Extracted via GPT-4o with conservative prompting

3. **Implicit Patterns in Notes (50% weight, 0.6 confidence)**
   - Recurring themes and aspirations
   - Inferred from multiple notes showing consistent intent
   - Lower confidence, used as supporting context

4. **Behavioral Inference (30% weight, 0.4-0.5 confidence)**
   - Active pipeline deals → sales goals
   - Executive contacts → networking goals
   - High interaction frequency → relationship maintenance goals
   - Lowest confidence, requires multiple signals

## Database Schema

### **user_profiles (extended)**

```sql
ALTER TABLE user_profiles ADD COLUMN
  personal_goal TEXT,        -- User-facing in settings
  networking_goal TEXT,      -- User-facing in settings
  business_goal TEXT,        -- User-facing in settings
  goals_updated_at TIMESTAMPTZ;
```

### **ai_user_context (new)**

Hidden intelligence layer - **NOT shown in UI**

```sql
CREATE TABLE ai_user_context (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Inferred goals (AI use only)
  inferred_goals JSONB DEFAULT '[]'::jsonb,
  -- Structure: [
  --   {
  --     "source": "explicit_field|note_explicit|note_implicit|behavior",
  --     "category": "business|networking|personal",
  --     "goal_text": "Close 5 enterprise deals this quarter",
  --     "confidence": 0.95,
  --     "weight": 100,
  --     "evidence": ["Set in profile field"],
  --     "extracted_from": "user_profile.business_goal"
  --   }
  -- ]
  
  communication_style TEXT,         -- Future: AI-inferred style
  key_priorities JSONB DEFAULT '[]', -- Future: ranked priorities
  relationship_approach TEXT,        -- Future: networking style
  behavioral_patterns JSONB DEFAULT '{}', -- Future: behavior models
  
  last_analyzed_at TIMESTAMPTZ DEFAULT now(),
  analysis_version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Goal Inference Logic

### **1. Explicit Goals (user_profiles)**

```typescript
// Direct extraction from profile fields
if (profile.business_goal) {
  goals.push({
    source: 'explicit_field',
    category: 'business',
    goal_text: profile.business_goal,
    confidence: 1.0,
    weight: 100,
    evidence: ['Explicitly set in profile']
  });
}
```

### **2. Goals from Persona Notes (AI extraction)**

```typescript
// GPT-4o extracts goals with evidence
const prompt = `Extract user goals from these personal notes.

1. EXPLICIT goals: "My goal is...", "I want to...", "I need to..."
2. IMPLICIT goals: Recurring themes, aspirations, patterns

For each goal:
- Categorize: business, networking, personal
- Be conservative - only clear intentions
- Provide evidence from notes

Return JSON:
{
  "explicit_goals": [
    {
      "goal_text": "Close 5 enterprise deals this quarter",
      "category": "business",
      "evidence": "Mentioned in note from Oct 1: 'This quarter I need to close 5 enterprise deals'"
    }
  ],
  "implicit_goals": [...]
}`;

// Result stored with appropriate weight
```

### **3. Behavioral Inference**

```typescript
// Active pipeline → sales goals
if (activeDealCount > 5) {
  const targetDeals = Math.ceil(activeDealCount * 0.6);
  goals.push({
    source: 'behavior',
    category: 'business',
    goal_text: `Close ${targetDeals} deals this quarter`,
    confidence: 0.5,
    weight: 30,
    evidence: [`${activeDealCount} active deals in pipeline`]
  });
}

// Executive contacts → networking goals
if (executiveTitles.length > 5) {
  goals.push({
    source: 'behavior',
    category: 'networking',
    goal_text: `Connect with ${executiveTitles.length + 5} senior leaders`,
    confidence: 0.45,
    weight: 30,
    evidence: [`${executiveTitles.length} senior leaders in network`]
  });
}
```

### **4. Deduplication & Merging**

```typescript
// Group by category, take highest weight per category
// If explicit field goal exists, it always wins
// Otherwise merge evidence from multiple sources
```

## Integration Points

### **A. Message Composition (/v1/compose)**

Goals are **invisibly injected** into the AI prompt:

```typescript
const goalsContext = await getUserGoalsForAI(userId, supabase);

const prompt = `You are helping craft a ${channel} message.
${goalsContext}
${tmplInfo}
Contact Context: ${contactCtx}

Consider how this message can advance relevant goals while maintaining authenticity. 
DO NOT explicitly mention the user's goals unless it's natural to do so.`;
```

**Example injected context:**

```
User's Goals (context for AI - don't explicitly mention unless asked):
- [business] Close 5 enterprise deals this quarter (✓ Explicit, confidence: 100%)
- [networking] Build stronger CTO network (From notes, confidence: 85%)
- [personal] Maintain regular contact with key relationships (Inferred, confidence: 40%)
```

### **B. Goal Suggestions (/v1/contacts/:id/goal-suggestions)**

AI suggests actions aligned with inferred goals:

```typescript
const goalsContext = await getUserGoalsForAI(userId, supabase);

const prompt = `Analyze this contact and suggest actions.
${JSON.stringify(contactData)}
${goalsContext}

Align suggestions with user's goals where relevant.`;
```

### **C. Context Bundle (/v1/contacts/:id/context-bundle)** (Future)

Could include user goals in the `context` object for AI agents:

```typescript
{
  contact: {...},
  interactions: [...],
  context: {
    prompt_skeleton: "...",
    brand_rules: {...},
    user_goals: [...] // Future: include inferred goals
  }
}
```

## Daily Sync (Cron Job)

**Schedule:** Daily at 2 AM (configured in `vercel.json`)

```typescript
// /api/cron/sync-ai-context
// Process active users (signed in within last 30 days)
for (const user of activeUsers) {
  // 1. Infer goals from all sources
  const inferredGoals = await inferUserGoals(user.id, supabase);
  
  // 2. Store in ai_user_context
  await supabase.from('ai_user_context').upsert({
    user_id: user.id,
    inferred_goals: inferredGoals,
    last_analyzed_at: now()
  });
}
```

**Performance:** ~100 users/batch, processes in background

## SQL Helper Functions

### **get_user_goals_for_ai(user_id)**

Returns formatted string ready for AI prompt injection:

```sql
SELECT get_user_goals_for_ai('user-uuid-here');
-- Returns:
-- 
-- User's Goals (context for AI - don't explicitly mention unless asked):
-- - [business] Close 5 enterprise deals this quarter (✓ Explicit, confidence: 100%)
-- - [networking] Build stronger CTO network (From notes, confidence: 85%)
```

## Privacy & UX Design

### **Invisible by Design**

- ❌ **NOT shown in UI** (no goal management screens yet)
- ❌ **NOT mentioned in AI responses** (unless natural)
- ✅ **Silently guides AI decisions** (better suggestions)
- ✅ **User can optionally set explicit goals** (profile settings, future)

### **Why Invisible?**

1. **Reduces cognitive load:** Users don't need to explicitly manage goals
2. **Avoids awkward AI behavior:** Goals guide decisions without being preachy
3. **Natural discovery:** System learns from user's existing notes and behavior
4. **Optional explicit override:** User can set explicit goals if desired

### **When Goals Might Be Visible (Future)**

- Optional "My Goals" section in settings (opt-in)
- Goal progress dashboard (if user enables tracking)
- Goal-aligned analytics ("How this contact relates to your goals")

## Example Scenarios

### **Scenario 1: Sales Rep**

**Explicit Goal:** "Close 10 deals this quarter" (set in profile)  
**Behavior:** 12 active deals in pipeline, mostly enterprise contacts  
**Notes:** Multiple mentions of "enterprise sales", "Q4 targets"

**Inferred Goals:**
```json
[
  {
    "source": "explicit_field",
    "category": "business",
    "goal_text": "Close 10 deals this quarter",
    "confidence": 1.0,
    "weight": 100
  },
  {
    "source": "note_explicit",
    "category": "business",
    "goal_text": "Focus on enterprise sales",
    "confidence": 0.85,
    "weight": 80
  }
]
```

**AI Behavior:**
- Prioritizes re-engagement with enterprise contacts
- Suggests demos and proposal follow-ups
- Frames messages around business value
- **Never says:** "Since your goal is to close 10 deals..."
- **Instead:** Naturally suggests actions that advance deals

### **Scenario 2: Networker**

**Notes:** "Want to connect with more CTOs", "Building my tech leadership network"  
**Behavior:** 20+ CTO/VP contacts, high LinkedIn interaction frequency

**Inferred Goals:**
```json
[
  {
    "source": "note_explicit",
    "category": "networking",
    "goal_text": "Connect with tech CTOs and VPs",
    "confidence": 0.85,
    "weight": 80
  },
  {
    "source": "behavior",
    "category": "networking",
    "goal_text": "Build relationships with 30+ tech leaders",
    "confidence": 0.5,
    "weight": 30
  }
]
```

**AI Behavior:**
- Suggests introductions to CTOs
- Recommends tech events and conferences
- Frames messages around thought leadership
- Suggests regular check-ins with existing CTO contacts

### **Scenario 3: Relationship Manager**

**No explicit goals**, but high interaction frequency and recurring "stay in touch" themes

**Inferred Goals:**
```json
[
  {
    "source": "note_implicit",
    "category": "personal",
    "goal_text": "Maintain strong relationships with key contacts",
    "confidence": 0.6,
    "weight": 50
  },
  {
    "source": "behavior",
    "category": "personal",
    "goal_text": "Regular contact with key relationships",
    "confidence": 0.4,
    "weight": 30
  }
]
```

**AI Behavior:**
- Prioritizes re-engagement when contacts go cold
- Suggests check-ins and touch-points
- Recommends personal touches (birthdays, milestones)

## API Usage

### **For AI Endpoints**

```typescript
import { getUserGoalsForAI } from '@/lib/goal-inference';

// In any AI endpoint
const goalsContext = await getUserGoalsForAI(userId, supabase);
const prompt = `${basePrompt}\n${goalsContext}\n...`;
```

### **For Manual Sync (testing)**

```typescript
import { inferUserGoals } from '@/lib/goal-inference';

const goals = await inferUserGoals(userId, supabase);
console.log('Inferred goals:', goals);
```

## Deployment

### **1. Run Migration**

```bash
psql $DATABASE_URL -f migrations/ai-goal-inference.sql
```

### **2. Set Environment Variables**

```bash
# CRON_SECRET already set (used by existing warmth alerts cron)
# No new env vars needed
```

### **3. Test Cron Job**

```bash
# Manually trigger (requires CRON_SECRET)
curl -X GET https://ever-reach-be.vercel.app/api/cron/sync-ai-context \
  -H "Authorization: Bearer $CRON_SECRET"
```

### **4. Verify Integration**

```bash
# Test compose endpoint (should include goals in prompt)
curl -X POST https://ever-reach-be.vercel.app/v1/compose \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "...",
    "channel": "email",
    "goal": "Re-engage after long silence"
  }'
```

## Performance

- **Inference time:** ~2-5 seconds per user (GPT-4o call for notes)
- **Cron job:** Processes 100 users in ~5 minutes
- **Database queries:** Indexed lookups (user_id), minimal overhead
- **AI prompt injection:** ~200-500 tokens added per request

## Future Enhancements

1. **Explicit Goal Management UI** (optional settings page)
2. **Goal Progress Tracking** (if user enables)
3. **Goal-Contact Associations** (lightweight version of removed feature)
4. **Multi-goal Balancing** (weighted suggestions across goals)
5. **Temporal Goals** ("This quarter", "By EOY")
6. **Goal Achievement Detection** (auto-mark completed)
7. **Goal Recommendations** ("Based on your notes, consider setting a goal to...")

## Files Created

- `migrations/ai-goal-inference.sql` (220 lines)
- `lib/goal-inference.ts` (400 lines)
- `app/api/cron/sync-ai-context/route.ts` (100 lines)

## Files Modified

- `app/api/v1/compose/route.ts` (inject goals)
- `app/api/v1/contacts/[id]/goal-suggestions/route.ts` (use inferred goals)
- `vercel.json` (add cron schedule)

## Total Impact

- **Lines of code:** ~800 new, ~80 modified
- **Database tables:** 2 (1 new, 1 extended)
- **API endpoints:** 1 new cron job
- **AI integration:** 2 endpoints enhanced
- **User-facing changes:** None (invisible by design)

---

**Status:** ✅ Complete and deployed to `feat/backend-vercel-only-clean`  
**Branch:** `feat/backend-vercel-only-clean`  
**Commit:** `1bf536f`
