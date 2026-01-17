# Onboarding V2 Database Schema Reference

**Total Questions:** 22  
**Removed Questions:** Q12 (today_list_size), Q15 (privacy_mode)  
**Database Table:** `onboarding_responses_v2`

---

## 📊 Complete Column Mapping

### Metadata Columns (7)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `version` | INT | Always 2 for V2 |
| `path` | TEXT | 'paid' or 'free' |
| `completed_at` | TIMESTAMPTZ | When onboarding finished |
| `created_at` | TIMESTAMPTZ | When started |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### Question Columns (22)

## Phase 1: Easy Warmup (Q1-Q5)

| Q# | Column | Question | Values |
|----|--------|----------|--------|
| **Q1** | `profile_first_name` | What should we call you? | Any text |
| **Q2** | `feeling_lose_touch` | Do you ever feel like you're losing touch with people? | `often`, `sometimes`, `rarely` |
| **Q3** | `persona_type` | Which sounds most like you? | `founder`, `worker_student`, `other` |
| **Q4** | `desired_contacts_size` | How many people would you realistically want to keep in touch with? | `lt25`, `25_75`, `gt75` |
| **Q5** | `last_reachout_window` | When was the last time you messaged someone you have been meaning to reach out to? | `lt1m`, `few_months`, `cant_remember` |

---

## Phase 2: What You Need Help With (Q6-Q10)

| Q# | Column | Question | Values |
|----|--------|----------|--------|
| **Q6** | `friction_primary` | What makes it hard to stay in touch? | `forget`, `dont_know_what_to_say`, `both_other` |
| **Q7** | `focus_segment` | Where do you want to focus first? | `work`, `personal`, `both` |
| **Q8** | `goal_30_days` | In 30 days, what would success look like? | `opportunities`, `reconnect`, `consistency` |
| **Q9** | `existing_system` | Do you have a system for this already? | `yes_system`, `messy`, `none` |
| **Q10** | `daily_help_pref` | What helps you most on a daily basis? | `who`, `what`, `both` |

---

## Phase 3: How EverReach Should Feel (Q11-Q13)

| Q# | Column | Question | Values |
|----|--------|----------|--------|
| **Q11** | `message_style` | When you reach out, what feels most like 'you'? | `super_short`, `short_friendly`, `detailed`, `mixed` |
| **Q12** | `channel_primary` | How do you usually reach out? | `text_calls`, `email_linkedin`, `mixed` |
| **Q13** | `assistance_level` | When you reach out, how much help do you want from EverReach? | `ai_help`, `reminders_only`, `mix` |

**Note:** Original Q12 (`today_list_size`) was removed, Q13-Q24 shifted up by 1.

---

## Phase 4: Privacy & Safety (Q14-Q16)

| Q# | Column | Question | Values |
|----|--------|----------|--------|
| **Q14** | `contacts_comfort` | How do you feel about EverReach using your contacts to remind you? | `ok`, `ok_control`, `not_comfortable` |
| **Q15** | `analytics_consent` | Can we use anonymous, combined data to make the app better over time? | `yes`, `no` |
| **Q16** | `import_start_method` | What's the easiest way to bring your people into EverReach? | `import_contacts`, `manual_few` |

**Note:** Original Q15 (`privacy_mode`) was removed, Q16-Q24 shifted up by 1 more.

---

## Phase 5: First Win / Aha Moment (Q17-Q18)

| Q# | Column | Question | Values |
|----|--------|----------|--------|
| **Q17** | `first_person_flag` | Is there one person you have been meaning to reach out to? | `yes`, `not_now`, `skip` |
| **Q18** | `first_person_name` | Who is that person? | Text (e.g. "Mom", "Alex") |

---

## Phase 6: Expectation Setting & Emotional Anchoring (Q19-Q22)

| Q# | Column | Question | Values |
|----|--------|----------|--------|
| **Q19** | `first_week_win` | In your first week, what would feel like a 'win' with EverReach? | `reconnect`, `on_top`, `lead` |
| **Q20** | `worst_to_forget` | Which of these would you feel worst about forgetting? | `personal`, `work`, `both` |
| **Q21** | `celebrate_wins` | Do you want EverReach to celebrate your small wins? | `yes`, `low_key`, `unsure` |
| **Q22** | `why_matters` | Last one: Why does staying in touch matter to you right now? | `relationships`, `work`, `both` |

---

## 🔄 Branching Logic

### Free Path Branching (Q16 → Email)
After Q16, free path users go to email capture before continuing to Q17.

### Q17 Branching (First Person)
- If `first_person_flag = 'yes'` → Show Q18 (enter name)
- If `first_person_flag = 'not_now'` or `'skip'` → Skip Q18, go to Q19

---

## 📋 Quick Stats

| Metric | Count |
|--------|-------|
| **Total Columns** | 29 (7 metadata + 22 questions) |
| **Total Questions** | 22 |
| **Phases** | 6 |
| **Text Input Questions** | 2 (Q1, Q18) |
| **Single Choice Questions** | 20 |
| **Conditional Questions** | 1 (Q18 - only if Q17 = 'yes') |

---

## 🗄️ Indexes

```sql
idx_onboarding_v2_user_id         -- Fast user lookups
idx_onboarding_v2_completed_at    -- Filter by completion
idx_onboarding_v2_path            -- Group by paid/free
idx_onboarding_v2_persona         -- Analyze by persona type
idx_onboarding_v2_focus           -- Analyze by focus segment
```

---

## 🔐 Security

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only view/edit their own responses
- ✅ Service role has full access for analytics

---

## 🚀 Usage Example

### Insert New Response

```sql
INSERT INTO onboarding_responses_v2 (
  user_id,
  version,
  path,
  profile_first_name,
  feeling_lose_touch,
  persona_type,
  desired_contacts_size,
  last_reachout_window,
  friction_primary,
  focus_segment,
  goal_30_days,
  existing_system,
  daily_help_pref,
  message_style,
  channel_primary,
  assistance_level,
  contacts_comfort,
  analytics_consent,
  import_start_method,
  first_person_flag,
  first_person_name,
  first_week_win,
  worst_to_forget,
  celebrate_wins,
  why_matters,
  completed_at
) VALUES (
  'user-uuid',
  2,
  'paid',
  'Isaiah',
  'often',
  'founder',
  'lt25',
  'few_months',
  'both_other',
  'both',
  'reconnect',
  'messy',
  'both',
  'mixed',
  'mixed',
  'mix',
  'ok',
  'yes',
  'import_contacts',
  'yes',
  'Mom',
  'reconnect',
  'both',
  'yes',
  'both',
  NOW()
);
```

---

## 📊 Analytics Queries

### Completion Rate by Path

```sql
SELECT 
  path,
  COUNT(*) as total_started,
  COUNT(completed_at) as completed,
  ROUND(COUNT(completed_at) * 100.0 / COUNT(*), 2) as completion_rate
FROM onboarding_responses_v2
GROUP BY path;
```

### Most Common Persona Types

```sql
SELECT 
  persona_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM onboarding_responses_v2
WHERE persona_type IS NOT NULL
GROUP BY persona_type
ORDER BY count DESC;
```

### Focus Segment Distribution

```sql
SELECT 
  focus_segment,
  COUNT(*) as count
FROM onboarding_responses_v2
WHERE focus_segment IS NOT NULL
GROUP BY focus_segment
ORDER BY count DESC;
```

---

## ✅ Verification Query

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'onboarding_responses_v2'
ORDER BY ordinal_position;
```

**Expected:** 29 columns total

---

**Last Updated:** November 23, 2025
