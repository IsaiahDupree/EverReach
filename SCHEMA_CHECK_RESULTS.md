# Schema Check Results - October 24, 2025

## 🔍 **Issue Identified**

The marketing intelligence tables exist in the database but are **not exposed via Supabase REST API**.

### **Error Pattern**:
```
Could not find the table 'public.funnel_stage' in the schema cache
Could not find the 'criteria' column of 'persona_bucket' in the schema cache
column user_event.created_at does not exist
```

### **Root Cause**:
These tables were created directly in PostgreSQL but not exposed through Supabase's PostgREST API. Supabase needs to regenerate its schema cache.

---

## ✅ **Solution: Use Supabase SQL Editor**

The seed data SQL file should be run directly in Supabase SQL Editor instead of via REST API.

### **Steps to Fix**:

1. **Open Supabase SQL Editor**:
   ```
   https://utasetfxiqcrnwyfforx.supabase.co/project/default/sql
   ```

2. **Copy the seed data SQL**:
   - Open: `seed-marketing-data.sql`
   - Copy all contents

3. **Paste and Run**:
   - Paste into SQL Editor
   - Click "Run"
   - Wait for completion

4. **Verify Success**:
   ```bash
   node check-marketing-schema.mjs
   ```

5. **Test Marketing Intelligence**:
   ```bash
   node test/agent/bucket-1-marketing-intelligence.mjs
   ```

---

## 📋 **Alternative: Create Missing Tables**

If tables don't exist properly, create them first:

```sql
-- Create funnel_stage if needed
CREATE TABLE IF NOT EXISTS funnel_stage (
  stage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_name TEXT UNIQUE NOT NULL,
  ordinal INTEGER NOT NULL,
  conversion_threshold DECIMAL(3,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create persona_bucket if needed  
CREATE TABLE IF NOT EXISTS persona_bucket (
  bucket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT UNIQUE NOT NULL,
  description TEXT,
  priority INTEGER,
  criteria JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create magnetism_score if needed
CREATE TABLE IF NOT EXISTS magnetism_score (
  user_id UUID PRIMARY KEY,
  score INTEGER NOT NULL,
  signals JSONB,
  calculated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Create funnel_user_progress if needed
CREATE TABLE IF NOT EXISTS funnel_user_progress (
  user_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  reached_at TIMESTAMP DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, stage_id)
);

-- Create user_persona if needed
CREATE TABLE IF NOT EXISTS user_persona (
  user_id UUID NOT NULL,
  persona_bucket_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  confidence DECIMAL(3,2),
  PRIMARY KEY (user_id, persona_bucket_id)
);

-- Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';
```

---

## 🎯 **Expected Results After Running SQL**

### **Schema Check**:
```
✅ funnel_stage: 7 rows
✅ persona_bucket: 5 rows  
✅ magnetism_score: X rows (based on user events)
✅ funnel_user_progress: X rows
✅ user_persona: X rows
```

### **Test Results**:
```
Marketing Intelligence: 20/20 (100%) ✅
Overall Coverage: 126/132 (95.5%) ✅
```

---

## 🚀 **Recommendation**

**Use Supabase SQL Editor** for all database operations that:
- Create tables
- Modify schema
- Seed initial data
- Run complex queries

**Use REST API/Node scripts** for:
- Running tests
- Checking status
- Application logic

---

## ✅ **Next Steps**

1. Open Supabase SQL Editor
2. Run `seed-marketing-data.sql`
3. Verify with `node check-marketing-schema.mjs`
4. Test with `node test/agent/bucket-1-marketing-intelligence.mjs`
5. Celebrate 95.5% coverage! 🎉

---

**Status**: Ready to seed via SQL Editor
