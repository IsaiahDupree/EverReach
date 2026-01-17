# Autopilot Policies API

Configure automated relationship management rules and AI agent behavior.

**Base Endpoint**: `/v1/policies/autopilot`

---

## Overview

Autopilot policies allow you to:
- **Automate routine tasks** - Let AI handle repetitive relationship management
- **Set guardrails** - Define when AI can act autonomously vs. require approval
- **Customize behavior** - Tune AI agent aggressiveness and style
- **Maintain control** - Always review and override AI decisions

---

## Get Autopilot Settings

```http
GET /v1/policies/autopilot
```

### Response

```json
{
  "policies": {
    "enabled": true,
    "auto_re_engage": {
      "enabled": true,
      "warmth_threshold": 30,
      "max_attempts": 3,
      "cooldown_days": 14,
      "requires_approval": true,
      "channels": ["email"],
      "exclude_tags": ["dnc", "unsubscribed"]
    },
    "auto_follow_up": {
      "enabled": true,
      "days_after_interaction": 7,
      "interaction_types": ["email", "call", "meeting"],
      "requires_approval": true,
      "max_per_week": 5
    },
    "auto_nurture": {
      "enabled": false,
      "frequency_days": 30,
      "target_tags": ["customer", "lead"],
      "content_types": ["value_add", "check_in"],
      "requires_approval": true
    },
    "ai_limits": {
      "max_messages_per_day": 10,
      "max_messages_per_contact_per_month": 4,
      "respect_quiet_hours": true,
      "respect_dnc": true
    },
    "approval_rules": {
      "always_approve_vip": true,
      "always_approve_new_contacts": true,
      "auto_approve_below_deal_size": 1000
    }
  }
}
```

---

## Update Autopilot Settings

```http
PATCH /v1/policies/autopilot
Content-Type: application/json
```

### Example - Enable Re-engagement

```typescript
await fetch('/v1/policies/autopilot', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    auto_re_engage: {
      enabled: true,
      warmth_threshold: 35,
      requires_approval: true,
      channels: ['email', 'sms']
    }
  })
});
```

### Example - Disable Autopilot

```typescript
await fetch('/v1/policies/autopilot', {
  method: 'PATCH',
  body: JSON.stringify({
    enabled: false  // Disable all autopilot features
  })
});
```

---

## Policy Types

### 1. Auto Re-engage

Automatically reach out to cooling contacts.

**Trigger**: Contact warmth drops below threshold

**Actions**:
- AI composes re-engagement message
- Queues for approval (if required)
- Tracks attempts and respects cooldown

**Settings**:
```typescript
{
  "auto_re_engage": {
    "enabled": true,
    "warmth_threshold": 30,        // Alert when warmth < 30
    "max_attempts": 3,             // Max 3 re-engagement attempts
    "cooldown_days": 14,           // Wait 14 days between attempts
    "requires_approval": true,     // Require manual approval
    "channels": ["email"],         // Only use email
    "exclude_tags": ["dnc"]        // Skip contacts with dnc tag
  }
}
```

---

### 2. Auto Follow-up

Automatically follow up after interactions.

**Trigger**: N days after interaction with no response

**Actions**:
- AI composes follow-up message
- References previous interaction
- Suggests next steps

**Settings**:
```typescript
{
  "auto_follow_up": {
    "enabled": true,
    "days_after_interaction": 7,                    // Follow up after 7 days
    "interaction_types": ["email", "call"],         // Only for email/calls
    "requires_approval": true,
    "max_per_week": 5,                              // Max 5 follow-ups per week
    "only_if_no_response": true                     // Skip if they responded
  }
}
```

---

### 3. Auto Nurture

Periodic value-add touchpoints for specific segments.

**Trigger**: Time-based (e.g., monthly)

**Actions**:
- AI finds relevant content
- Composes personalized message
- Maintains relationship momentum

**Settings**:
```typescript
{
  "auto_nurture": {
    "enabled": true,
    "frequency_days": 30,                           // Monthly touchpoints
    "target_tags": ["customer", "partner"],         // Only for customers
    "content_types": ["value_add", "check_in"],     // Types of messages
    "requires_approval": true
  }
}
```

---

## AI Limits

Safety guardrails to prevent over-communication.

```typescript
{
  "ai_limits": {
    "max_messages_per_day": 10,                     // Global daily limit
    "max_messages_per_contact_per_month": 4,        // Per-contact limit
    "respect_quiet_hours": true,                    // Honor contact preferences
    "respect_dnc": true,                            // Never contact DNC contacts
    "min_warmth_for_outreach": 20                   // Don't contact very cold leads
  }
}
```

---

## Approval Rules

Define when autopilot requires manual approval.

```typescript
{
  "approval_rules": {
    "always_approve_vip": true,                     // VIPs always need approval
    "always_approve_new_contacts": true,            // First contact needs approval
    "auto_approve_below_deal_size": 1000,          // Auto-approve small deals
    "auto_approve_nurture": true,                   // Auto-send nurture emails
    "require_approval_re_engage": true              // Re-engagement needs approval
  }
}
```

---

## Common Patterns

### 1. Conservative Autopilot

```typescript
// Require approval for everything, just get AI drafts
await fetch('/v1/policies/autopilot', {
  method: 'PATCH',
  body: JSON.stringify({
    enabled: true,
    auto_re_engage: {
      enabled: true,
      requires_approval: true  // Always require approval
    },
    auto_follow_up: {
      enabled: true,
      requires_approval: true
    },
    auto_nurture: {
      enabled: false  // Manual only
    }
  })
});
```

### 2. Aggressive Autopilot

```typescript
// Auto-send for low-value contacts
await fetch('/v1/policies/autopilot', {
  method: 'PATCH',
  body: JSON.stringify({
    enabled: true,
    auto_re_engage: {
      enabled: true,
      requires_approval: false,  // Auto-send
      warmth_threshold: 25       // More aggressive
    },
    approval_rules: {
      always_approve_vip: true,         // VIPs need approval
      auto_approve_below_deal_size: 5000  // Auto-send for deals < $5k
    }
  })
});
```

### 3. Segment-Specific Policies

```typescript
// Different policies for different segments
await fetch('/v1/policies/autopilot', {
  method: 'PATCH',
  body: JSON.stringify({
    auto_nurture: {
      enabled: true,
      target_tags: ['lead'],              // Only leads
      frequency_days: 14,                 // Bi-weekly
      requires_approval: false            // Auto-send to leads
    },
    auto_re_engage: {
      enabled: true,
      target_tags: ['customer'],          // Only customers
      requires_approval: true             // Review customer messages
    }
  })
});
```

---

## Monitoring Autopilot Activity

### Get Autopilot Stats

```typescript
const stats = await fetch('/v1/policies/autopilot/stats', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

console.log('Autopilot activity:', stats);
```

### Response

```json
{
  "stats": {
    "messages_generated_today": 5,
    "messages_sent_today": 2,
    "messages_pending_approval": 3,
    "messages_this_week": 18,
    "contacts_re_engaged_this_month": 12,
    "follow_ups_sent_this_week": 7
  }
}
```

---

## Audit Trail

All autopilot actions are logged:

```typescript
// View autopilot activity
const audit = await fetch('/v1/policies/autopilot/audit', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());
```

### Response

```json
{
  "actions": [
    {
      "id": "action_abc",
      "type": "auto_re_engage",
      "contact_id": "550e8400-e29b-41d4-a716-446655440000",
      "contact_name": "Sarah Chen",
      "action_taken": "generated_message",
      "message_id": "msg_xyz",
      "requires_approval": true,
      "created_at": "2025-01-15T10:00:00Z",
      "trigger": {
        "rule": "warmth_threshold",
        "warmth_score": 28
      }
    }
  ]
}
```

---

## UI Examples

### Autopilot Settings Panel

```typescript
function AutopilotSettings() {
  const { data } = useQuery(['autopilot-policies'], () =>
    fetch('/v1/policies/autopilot').then(r => r.json())
  );
  
  const update = useMutation({
    mutationFn: (policies) =>
      fetch('/v1/policies/autopilot', {
        method: 'PATCH',
        body: JSON.stringify(policies)
      })
  });
  
  return (
    <div>
      <Toggle
        label="Enable Autopilot"
        checked={data?.policies.enabled}
        onChange={enabled => update.mutate({ enabled })}
      />
      
      <section>
        <h3>Auto Re-engage</h3>
        <Toggle
          checked={data?.policies.auto_re_engage.enabled}
          onChange={enabled =>
            update.mutate({
              auto_re_engage: { ...data.policies.auto_re_engage, enabled }
            })
          }
        />
        <Input
          label="Warmth Threshold"
          type="number"
          value={data?.policies.auto_re_engage.warmth_threshold}
          onChange={v => update.mutate({
            auto_re_engage: { warmth_threshold: v }
          })}
        />
      </section>
    </div>
  );
}
```

---

## Best Practices

### 1. Start Conservative

```typescript
// Start with everything requiring approval
await fetch('/v1/policies/autopilot', {
  method: 'PATCH',
  body: JSON.stringify({
    enabled: true,
    auto_re_engage: { enabled: true, requires_approval: true },
    auto_follow_up: { enabled: true, requires_approval: true },
    auto_nurture: { enabled: false }
  })
});

// Gradually enable auto-send as you trust the AI
```

### 2. Set Appropriate Limits

```typescript
// Don't overwhelm contacts
await fetch('/v1/policies/autopilot', {
  method: 'PATCH',
  body: JSON.stringify({
    ai_limits: {
      max_messages_per_contact_per_month: 3,  // Max 3/month per contact
      max_messages_per_day: 10,               // Max 10/day globally
      respect_quiet_hours: true
    }
  })
});
```

### 3. Monitor and Adjust

```typescript
// Check weekly stats
const stats = await fetch('/v1/policies/autopilot/stats').then(r => r.json());

if (stats.messages_pending_approval > 20) {
  // Too many pending, enable auto-send for some
  await enableAutoSendForLowValue();
}

if (stats.messages_sent_today > 50) {
  // Too aggressive, dial back
  await reduceLimits();
}
```

---

## Safety Features

### Automatic Safeguards

1. **DNC Respect**: Never contacts tags with `dnc`
2. **Quiet Hours**: Respects contact preferences
3. **Cooldown**: Prevents repeated messages
4. **Limits**: Hard caps on message volume
5. **Audit Trail**: All actions logged
6. **Reversible**: Can always disable policies

---

## Next Steps

- [Messages & Outbox](./23-messages-outbox.md) - Approval workflow
- [AI Compose](./07-ai-compose.md) - Message generation
- [Warmth Scoring](./05-warmth-scoring.md) - Understanding triggers
