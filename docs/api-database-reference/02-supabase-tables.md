# Supabase Tables Reference

## 📋 Complete Table List

### User & Auth
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `auth.users` | Supabase managed auth | `id`, `email` |
| `profiles` | User profiles | `user_id`, `stripe_customer_id`, `subscription_status` |
| `entitlements` | User plans | `user_id`, `plan`, `valid_until` |
| `subscriptions` | Subscription tracking | `user_id`, `product_id`, `store` |

### CRM Core
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `contacts` | Contact database | `id`, `user_id`, `display_name`, `emails`, `phones`, `warmth` |
| `interactions` | Contact interactions | `id`, `user_id`, `contact_id`, `kind`, `content` |
| `messages` | Threaded messages | `id`, `thread_id`, `role`, `content` |
| `threads` | Message threads | `id`, `user_id`, `title`, `metadata` |
| `persona_notes` | Voice notes | `id`, `user_id`, `type`, `transcript`, `tags` |
| `attachments` | File attachments | `id`, `user_id`, `contact_id`, `file_url` |

### Pipeline & Goals
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `contact_pipeline_state` | Current pipeline position | `contact_id`, `pipeline_id`, `stage_id` |
| `pipelines` | Pipeline definitions | `id`, `key`, `name` |
| `pipeline_stages` | Stage definitions | `id`, `pipeline_id`, `position` |
| `pipeline_transitions` | Pipeline history | `contact_id`, `from_stage_id`, `to_stage_id` |
| `goals` | Message goal templates | `id`, `kind`, `name`, `description` |

### Agent AI
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `agent_conversations` | AI chat history | `id`, `user_id`, `messages`, `token_count` |
| `user_agent_context` | Agent preferences | `user_id`, `context_key`, `context_value` |
| `contact_analysis` | AI insights | `contact_id`, `analysis_type`, `analysis_content` |
| `message_generations` | AI compositions | `user_id`, `contact_id`, `generated_body` |
| `agent_tasks` | Autonomous tasks | `user_id`, `task_type`, `status` |

### Analytics & Billing
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `store_receipts` | Purchase receipts | `user_id`, `store`, `external_tx_id` |
| `daily_recommendations` | Contact recommendations | `user_id`, `contact_id`, `score` |
| `interaction_metrics` | Aggregated metrics | `user_id`, `date`, `metrics_json` |
| `prompt_first_logs` | Feature telemetry | `user_id`, `action`, `metadata` |
| `audit_logs` | System audit trail | `user_id`, `action`, `entity_type` |

## 📝 Detailed Schemas

### `contacts`
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  emails JSONB DEFAULT '[]'::jsonb,
  phones JSONB DEFAULT '[]'::jsonb,
  company TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  warmth INTEGER DEFAULT 50,
  warmth_band TEXT, -- 'hot', 'warm', 'neutral', 'cool', 'cold'
  last_interaction_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### `interactions`
```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'message', 'call', 'note', 'email'
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `persona_notes`
```sql
CREATE TABLE persona_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'text' or 'voice'
  title TEXT,
  body_text TEXT,
  file_url TEXT,
  transcript TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT, -- 'pending', 'processing', 'complete', 'failed'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `agent_conversations`
```sql
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 🔍 Column Types Reference

### Common Patterns
- **UUIDs**: Primary keys and foreign keys
- **TEXT**: Strings of any length
- **JSONB**: Structured JSON data (indexed, queryable)
- **TEXT[]**: Array of strings (for tags, etc.)
- **TIMESTAMPTZ**: Timestamps with timezone
- **INTEGER**: Whole numbers (warmth scores, etc.)

### JSONB Structures

**`contacts.emails`**:
```json
[
  { "email": "john@example.com", "type": "work" }
]
```

**`contacts.metadata`**:
```json
{
  "idempotency_key": "unique-key",
  "source": "import",
  "custom_field": "value"
}
```

**`agent_conversations.messages`**:
```json
[
  {
    "role": "user",
    "content": "Hello",
    "timestamp": "2025-10-04T09:00:00Z"
  },
  {
    "role": "assistant",
    "content": "Hi! How can I help?",
    "timestamp": "2025-10-04T09:00:05Z"
  }
]
```

## 🔗 Relationships

### One-to-Many
- `auth.users` → `contacts` (one user, many contacts)
- `contacts` → `interactions` (one contact, many interactions)
- `threads` → `messages` (one thread, many messages)

### Many-to-One
- `interactions` → `contacts` (many interactions, one contact)
- `contacts` → `users` (many contacts, one user)

### Optional Relationships
- `interactions` → `contacts` (can be null for non-contact interactions)
- `attachments` → `contacts` (can be null for user-level attachments)

## Next Steps

Continue to [03-supabase-queries.md](./03-supabase-queries.md) for common query patterns.
