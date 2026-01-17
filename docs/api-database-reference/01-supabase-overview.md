# Supabase Database Overview

## 🏗️ Architecture

The Personal CRM uses Supabase (PostgreSQL) as its primary database with Row Level Security (RLS) for data isolation.

### Project Information
- **Project Ref**: `utasetfxiqcrnwyfforx`
- **URL**: `https://utasetfxiqcrnwyfforx.supabase.co`
- **Auth**: Supabase Auth with JWT tokens
- **Storage**: Supabase Storage for file uploads

## 📊 Database Structure

### Core Tables

#### User & Profile Management
- `auth.users` - Supabase auth users (managed by Supabase)
- `profiles` - User profiles and subscription info
- `entitlements` - User plan entitlements (free/pro)
- `subscriptions` - Active subscriptions tracking

#### CRM Core
- `contacts` - Contact information
- `interactions` - All interactions with contacts (messages, calls, notes)
- `messages` - Threaded conversations
- `threads` - Message thread metadata
- `persona_notes` - Voice notes and personal context
- `attachments` - File attachments

#### Relationships & Intelligence
- `contact_pipeline_state` - Sales pipeline tracking
- `pipelines` - Pipeline definitions
- `pipeline_stages` - Pipeline stage definitions
- `pipeline_transitions` - Pipeline move history
- `goals` - Message goals and templates
- `contact_analysis` - AI-generated contact insights (Agent system)

#### Agent AI System
- `agent_conversations` - Multi-turn AI chat history
- `user_agent_context` - Persistent agent preferences
- `message_generations` - AI-composed messages log
- `agent_tasks` - Autonomous task execution

#### Billing & Analytics
- `store_receipts` - In-app purchase receipts
- `daily_recommendations` - Daily contact recommendations
- `interaction_metrics` - Aggregated metrics
- `prompt_first_logs` - Telemetry for prompt-first feature
- `audit_logs` - System audit trail

## 🔐 Row Level Security (RLS)

All tables have RLS policies that enforce:
- Users can only access their own data
- Some operations require service role key
- Agent tables have user_id foreign keys with cascading deletes

### Common RLS Patterns

```sql
-- Users can view own data
CREATE POLICY "users_select_own" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own data
CREATE POLICY "users_insert_own" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own data
CREATE POLICY "users_update_own" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own data
CREATE POLICY "users_delete_own" ON table_name
  FOR DELETE USING (auth.uid() = user_id);
```

## 🔌 Client Access Patterns

### From Backend (Server-Side)

```typescript
import { createClient } from '@supabase/supabase-js';

// With service role (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// With user's token (respects RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  }
);
```

### From Frontend (Client-Side)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
```

## 📈 Indexes & Performance

Key indexes for performance:
- `contacts`: `user_id`, `deleted_at`, `last_interaction_at`
- `interactions`: `user_id`, `contact_id`, `created_at`
- `messages`: `thread_id`, `created_at`
- `agent_conversations`: `user_id`, `updated_at`

## 🔄 Migrations

Database schema is managed via SQL migration files:
- `supabase-setup.sql` - Main schema
- `backend-vercel/db/agent-schema.sql` - Agent system tables

## 📝 Naming Conventions

- **Tables**: `snake_case`, plural (e.g., `contacts`, `interactions`)
- **Columns**: `snake_case` (e.g., `user_id`, `created_at`)
- **Foreign Keys**: `{table}_id` (e.g., `contact_id`, `thread_id`)
- **Timestamps**: `created_at`, `updated_at`, ISO 8601 format
- **Soft Deletes**: `deleted_at` column (NULL = not deleted)

## 🎯 Best Practices

1. **Always use parameterized queries** - Prevents SQL injection
2. **Respect RLS** - Use service role only when necessary
3. **Use transactions** - For multi-table operations
4. **Index frequently queried columns** - Especially foreign keys
5. **Soft delete when possible** - Use `deleted_at` instead of DELETE
6. **Validate on both client and server** - Don't trust client input
7. **Use `.maybeSingle()`** - Instead of `.single()` to handle nulls gracefully

## Next Steps

Continue to [02-supabase-tables.md](./02-supabase-tables.md) for detailed table schemas.
