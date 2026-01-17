# 📋 Complete Event Taxonomy for EverReach CRM

**Date**: October 22, 2025  
**Source**: ChatGPT conversation insights  
**Total Events**: 100+ events across 10 categories  
**Format**: `verb_object` naming convention

---

## 🎯 Event Envelope (Global Structure)

All events use this wrapper:

```json
{
  "event_id": "uuid-v4",
  "event_name": "verb_object",
  "event_time": "2025-10-20T19:22:00Z",
  "user_id": "usr_123",
  "anon_id": "dev_abc",
  "session_id": "ses_456",
  "properties": {},
  "app": {
    "platform": "ios|android|web",
    "version": "1.5.0",
    "build": 1500
  },
  "device": {
    "locale": "en-US",
    "tz": "America/New_York"
  },
  "privacy": {
    "consent_analytics": true,
    "consent_marketing": true,
    "att_status": "authorized"
  },
  "exp": {
    "experiment_name": "variant_value"
  },
  "source": {
    "utm_source": "ads",
    "utm_campaign": "q4_growth"
  },
  "synthetic": {
    "is_simulated": false,
    "persona_id": null,
    "scenario_id": null
  }
}
```

---

## 📊 Event Categories (10)

### **A) Lifecycle, Session, Performance** (10 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `app_open` | `launch_type: cold\|warm` | App launched by user |
| `session_start` | `reason: launch\|resume` | Session begins (foreground) |
| `screen_view` | `screen: Home\|Contacts\|Paywall` | A screen became visible |
| `foregrounded` | `prev_state: background` | App moved to foreground |
| `backgrounded` | - | App moved to background |
| `app_close` | - | App terminated |
| `cold_start_measured` | `ms: int` | Cold start duration |
| `api_error` | `endpoint, code, retriable` | API call failed |
| `render_slow_frame` | `screen, frame_ms` | Frame took >16ms |
| `battery_drain_sample` | `pct_per_hour: float` | Battery usage sample |

---

### **B) Identity & Contacts Graph** (14 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `signup_started` | `method: email\|apple\|google` | User began signup |
| `signup_completed` | `method: ...` | Account created |
| `contact_import_started` | `source: phonebook\|csv\|google\|icloud` | Import initiated |
| `contact_import_completed` | `source, imported_count, deduped_count` | Import finished |
| `contact_added` | `source: manual\|import, contact_id` | New contact created |
| `contact_edited` | `contact_id, fields: [...]` | Contact updated |
| `contact_merged` | `from_id, into_id` | Duplicate contacts merged |
| `relationship_tag_added` | `contact_id, tag` | Tag applied to contact |
| `relationship_tag_removed` | `contact_id, tag` | Tag removed |
| `note_added` | `contact_id, source: keyboard\|voice` | Note created |
| `followup_created` | `contact_id, due_in_days` | Follow-up scheduled |
| `followup_completed` | `contact_id` | Follow-up marked done |
| `warmth_updated` | `contact_id, warmth_score, warmth_band` | Warmth recalculated |
| `contact_deleted` | `contact_id, reason` | Contact removed |

---

### **C) Outreach & Content** (9 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `outreach_sent` | `contact_id, channel: sms\|email\|ig_dm\|whatsapp\|call, template_id` | Message sent |
| `reply_marked` | `contact_id, channel` | Reply received |
| `cta_clicked` | `contact_id, cta: schedule_call\|share_link` | Call-to-action clicked |
| `template_opened` | `template_id` | Template viewed |
| `template_favorited` | `template_id` | Template saved |
| `template_created` | `source: gallery\|scratch` | New template made |
| `template_edited` | `template_id, fields: [...]` | Template modified |
| `template_deleted` | `template_id` | Template removed |
| `message_generation_started` | `contact_id, goal, channel` | AI composition began |

---

### **D) Coach, Recommendations, Personalization** (8 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `suggested_contacts_shown` | `count, reason: neglected\|likely_to_reply` | Suggestions displayed |
| `suggested_contact_clicked` | `contact_id, rank` | Suggestion selected |
| `suggested_template_shown` | `template_id, topic: reconnect\|warmth` | Template suggested |
| `suggested_template_clicked` | `template_id, rank` | Suggestion used |
| `daily_plan_shown` | `todos: int` | Daily plan displayed |
| `daily_plan_clicked` | `item_type: contact\|followup, item_id` | Daily plan item actioned |
| `activation_progress_shown` | `contacts, outreach_remaining` | Progress nudge shown |
| `ha_moment_reached` | `contacts, outreach` | "Aha moment" achieved |

---

### **E) Notifications & In-App Messages** (9 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `notif_candidate` | `topic: contacts\|warmth\|followups, reason: gap_48h\|streak_break` | Notification considered |
| `notif_scored` | `topic, score, score_adj, policy_send, ranker_version` | ML score computed |
| `notif_sent` | `topic, channel: push\|email\|inapp` | Notification delivered |
| `notif_opened` | `topic` | Notification tapped |
| `notif_converted` | `topic, action: outreach_sent\|app_open` | Notification led to action |
| `inapp_banner_shown` | `banner_id` | In-app message displayed |
| `inapp_banner_clicked` | `banner_id` | In-app message tapped |
| `push_permission_requested` | - | Permission prompt shown |
| `push_permission_granted` | - | Permission allowed |

---

### **F) Monetization** (11 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `paywall_view` | `context: threshold_hit\|feature_locked, plan_shown: pro_monthly\|pro_yearly` | Paywall displayed |
| `paywall_dismissed` | `plan_shown, time_viewed_sec` | Paywall closed |
| `trial_started` | `plan: pro` | Free trial activated |
| `trial_completed` | `plan, converted: bool` | Trial ended |
| `purchase_completed` | `plan, term: monthly\|annual, price_cents` | Subscription purchased |
| `purchase_renewed` | `plan, term` | Auto-renewal succeeded |
| `purchase_canceled` | `reason: price\|value\|other` | Subscription canceled |
| `purchase_refunded` | `plan, reason` | Refund issued |
| `billing_error` | `error_code, plan` | Payment failed |
| `restore_purchases_tapped` | - | Restore button clicked |
| `restore_purchases_completed` | `restored_count` | Purchases restored |

---

### **G) Settings, Privacy, Integrity** (7 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `consent_analytics_changed` | `enabled: bool` | Analytics consent toggled |
| `consent_marketing_changed` | `enabled: bool` | Marketing consent toggled |
| `privacy_viewed` | - | Privacy policy viewed |
| `theme_changed` | `theme: light\|dark\|auto` | Theme preference changed |
| `data_export_requested` | - | User requested data export |
| `account_deletion_requested` | `reason` | User requested deletion |
| `automation_rate_limited` | `endpoint` | Rate limit hit |

---

### **H) Experiments & Feature Flags** (4 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `ab_assigned` | `experiment, variant` | User bucketed into variant |
| `ab_exposed` | `experiment, variant, surface: screen\|notif\|paywall` | Variant shown to user |
| `flag_evaluated` | `flag, enabled` | Feature flag checked |
| `flag_override_applied` | `flag, override_value` | Manual override used |

---

### **I) External Marketing Funnel** (10 events)

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `ad_impression` | `network: meta\|tt\|google, campaign_id, creative_id` | Ad shown |
| `ad_click` | `network, campaign_id, creative_id` | Ad clicked |
| `landing_view` | `page: lp_v1\|lp_v2` | Landing page viewed |
| `lead_captured` | `source: lp\|quiz\|waitlist` | Email/contact captured |
| `install_tracked` | `network` | App install attributed |
| `qualified_signup` | `lead_score: int` | High-quality signup |
| `first_open_post_install` | - | First app open after install |
| `activation_event` | `type: contacts_10_plus\|first_outreach` | Activation milestone |
| `email_opened` | `campaign_id, template_id` | Marketing email opened |
| `email_clicked` | `campaign_id, link_url` | Email link clicked |

---

### **J) Simulation Lab** (8 events)

*All these carry `synthetic.is_simulated=true` in envelope*

| Event Name | Properties | Description |
|-----------|-----------|-------------|
| `sim_scenario_created` | `scenario_id, goal: retention\|cac_ltv, horizon_days` | Simulation started |
| `sim_persona_defined` | `persona_id, cluster: explorer\|power_user\|ghost, priors_version` | Persona created |
| `sim_tick` | `scenario_id, day` | Simulation day advanced |
| `sim_action` | `persona_id, action: open_app\|send_outreach\|ignore_notif, policy: rules\|ranker_v1` | Simulated user action |
| `sim_reward` | `metric: d1_return\|open_to_action\|ltv, value: float` | Reward signal |
| `sim_experiment_assigned` | `experiment, variant` | Simulated A/B test |
| `sim_summary` | `scenario_id, uplift_retention_pts, cost` | Simulation results |
| `sim_scenario_ended` | `scenario_id, duration_days` | Simulation completed |

---

## 🔧 Property Guidelines

### **Common Properties** (Include in Most Events)

```json
{
  "screen": "ContactDetail",
  "source": "push_notification",
  "platform": "ios",
  "version": "1.5.0",
  "experiment_assignments": {
    "paywall_copy": "B",
    "annual_banner": "on"
  }
}
```

### **Prohibited Properties** (Never Log)

❌ User names  
❌ Email addresses  
❌ Phone numbers  
❌ Message content (free-text)  
❌ Screenshots (raw images)  
❌ Audio files  
❌ Passwords (obviously)

### **Derived Properties** (Safe to Log)

✅ Character/word counts  
✅ Boolean flags (has_email, has_phone)  
✅ Categorical values (warmth_band, plan_type)  
✅ Numeric scores (warmth_score, sentiment_score)  
✅ Hashed IDs (SHA256)

---

## 📏 Event Naming Rules

### **Format**: `verb_object`

✅ **Good Examples**:
- `contact_added`
- `outreach_sent`
- `paywall_view`
- `trial_started`
- `notification_opened`

❌ **Bad Examples**:
- `addContact` (camelCase)
- `new_contact` (passive voice)
- `contact` (no verb)
- `user_does_action` (too verbose)

### **Verb Choices**

| Verb | When to Use |
|------|------------|
| `view` | Something displayed |
| `tap` / `click` | User interaction |
| `start` | Beginning of process |
| `complete` | End of process |
| `add` / `create` | New entity |
| `edit` / `update` | Modify existing |
| `delete` / `remove` | Destroy entity |
| `send` | Outbound action |
| `receive` | Inbound action |
| `open` | App/screen/message opened |
| `close` | App/screen closed |

---

## 🔐 Privacy-Safe Event Examples

### **Example 1: Contact Added**

❌ **Bad** (PII exposed):
```json
{
  "event": "contact_added",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-1234"
}
```

✅ **Good** (derived only):
```json
{
  "event": "contact_added",
  "contact_id": "c_abc123",
  "has_name": true,
  "has_email": true,
  "has_phone": true,
  "has_company": false,
  "tags_count": 2,
  "source": "manual"
}
```

### **Example 2: Message Sent**

❌ **Bad** (content exposed):
```json
{
  "event": "outreach_sent",
  "message_body": "Hey! How are you doing?",
  "recipient": "jane@example.com"
}
```

✅ **Good** (metadata only):
```json
{
  "event": "outreach_sent",
  "contact_id": "c_xyz789",
  "channel": "email",
  "template_id": "tmpl_123",
  "char_count": 24,
  "had_personalization": true,
  "ai_generated": false,
  "goal": "re_engage"
}
```

---

## 📊 Event Priority Tiers

### **Tier 1: Critical** (Must Track)
- `app_open`, `screen_view`
- `signup_completed`
- `contact_added`, `outreach_sent`
- `ha_moment_reached`
- `trial_started`, `purchase_completed`
- `ab_exposed`

### **Tier 2: Important** (Should Track)
- `notification_opened`, `notification_converted`
- `paywall_view`
- `contact_import_completed`
- `warmth_updated`
- `api_error`

### **Tier 3: Nice-to-Have** (Optional)
- `cold_start_measured`
- `template_favorited`
- `theme_changed`
- `battery_drain_sample`

---

## 🚀 Implementation Checklist

### **Before Adding New Event**

- [ ] Does it follow `verb_object` naming?
- [ ] Is it in the event catalog?
- [ ] Does it have a JSON schema?
- [ ] Are properties documented?
- [ ] Is PII excluded?
- [ ] Is it version 1.0.0?
- [ ] Does it have a purpose (decision-making)?

### **After Adding New Event**

- [ ] Update event catalog (this document)
- [ ] Create JSON schema
- [ ] Add to PostHog/analytics tool
- [ ] Update dbt models if needed
- [ ] Document in dashboard
- [ ] Verify in production (sample events)

---

## 📚 Quick Reference

**Total Events**: 100+  
**Categories**: 10  
**Naming**: `verb_object`  
**Format**: JSON with envelope  
**Privacy**: No PII, derived only  
**Versioning**: `event_version` field  

**Key Files**:
- This document: Event catalog
- `types/events.ts`: TypeScript types
- `services/analytics.ts`: Type-safe tracking
- `schemas/*.json`: JSON schemas

---

**From ChatGPT insights - Complete event taxonomy for production tracking**
