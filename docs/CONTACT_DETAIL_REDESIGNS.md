# Contact Detail Page - 3 Design Iterations

## Current Design Issues
- Limited data shown (just basic info + warmth score)
- Pipeline/Status chips take up space but don't show much value
- No interaction history visible
- No AI insights or suggestions
- Static, not leveraging available backend endpoints

---

## Available Backend Endpoints for Contact Detail

From `docs/api/`:

### Core Contact Data
```http
GET /v1/contacts/:id - Get full contact details
PATCH /v1/contacts/:id - Update contact
DELETE /v1/contacts/:id - Delete contact
```

### Interactions & Activity
```http
GET /v1/interactions?contact_id=:id&limit=10&sort=created_at:desc
POST /v1/interactions - Log new interaction
```

### AI Features
```http
GET /v1/analysis/:contact_id - Get AI relationship analysis
GET /v1/analysis/:contact_id/suggestions - Get AI action suggestions
POST /v1/compose?contact_id=:id - Generate AI message
```

### Extensions
```http
GET /v1/contacts/:id/files - Get uploaded files
GET /v1/contacts/:id/channels - Get communication channels
GET /v1/contacts/:id/notes - Get private notes
POST /v1/contacts/:id/notes - Add note
```

### Goals & Pipelines
```http
GET /v1/goals?contact_id=:id - Get related goals
GET /v1/contacts/:id/state - Get pipeline state
```

### Messages & Outbox
```http
GET /v1/messages?contact_id=:id - Get message history
POST /v1/messages - Send message
GET /v1/messages/drafts?contact_id=:id - Get drafts
```

---

# Iteration 1: **Activity Timeline View**

Focus: **Show contact's full relationship history chronologically**

## Layout

```
┌─────────────────────────────────────────────┐
│  ← Back          Jennifer Martinez     ⋮    │
├─────────────────────────────────────────────┤
│                                             │
│         [JM]                                │
│    Jennifer Martinez                        │
│   Creative Design Studio                    │
│                                             │
│   🔵 COLD 28/100    📊 Trend: ↓ -5 (7d)    │
│                                             │
│   📧 jennifer@...   📞 +1-555-...           │
│   🔗 LinkedIn       🐦 @jenniferm           │
│                                             │
├─────────────────────────────────────────────┤
│  [🤖 Ask AI]  [✉️ Compose]  [📞 Call]       │
├─────────────────────────────────────────────┤
│                                             │
│  💡 AI Insights                             │
│  ┌───────────────────────────────────────┐ │
│  │ ⚠️  No contact in 45 days               │ │
│  │ 💬 Recommended: Send reconnection msg   │ │
│  │ 📅 Suggested: Schedule coffee meeting   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  📅 Timeline                                │
│  ┌───────────────────────────────────────┐ │
│  │                                         │ │
│  │  Today                                  │ │
│  │  ○ No recent activity                   │ │
│  │                                         │ │
│  │  45 days ago - Sep 10                   │ │
│  │  📧 Sent email: "Project followup"      │ │
│  │     "Thanks for the initial meeting..." │ │
│  │     [View Full ▸]                       │ │
│  │                                         │ │
│  │  47 days ago - Sep 8                    │ │
│  │  🤝 Meeting: "Discovery Call"           │ │
│  │     Duration: 30 min                    │ │
│  │     📝 3 notes attached                  │ │
│  │     [View Details ▸]                    │ │
│  │                                         │ │
│  │  60 days ago - Aug 26                   │ │
│  │  📞 Phone call: "Initial Contact"       │ │
│  │     Duration: 15 min                    │ │
│  │                                         │ │
│  │  90 days ago - Jul 27                   │ │
│  │  ➕ Contact added                        │ │
│  │     Source: LinkedIn import             │ │
│  │     Tags: networking, design            │ │
│  │                                         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [+ Log Interaction]                        │
│                                             │
└─────────────────────────────────────────────┘
```

### Key Features
- **Full timeline** of interactions (`GET /v1/interactions?contact_id=:id`)
- **AI insights** at top (`GET /v1/analysis/:id`)
- **Channel links** (email, phone, LinkedIn) (`GET /v1/contacts/:id/channels`)
- **Warmth trend** shows 7-day change
- **Quick actions** for common tasks
- **Expandable entries** for full details

### API Calls on Load
```typescript
// 1. Get contact details
GET /v1/contacts/:id

// 2. Get interactions timeline
GET /v1/interactions?contact_id=:id&limit=50&sort=created_at:desc

// 3. Get AI analysis
GET /v1/analysis/:id

// 4. Get communication channels
GET /v1/contacts/:id/channels

// 5. Get warmth history for trend
GET /v1/warmth/history?contact_id=:id&days=7
```

---

# Iteration 2: **Dashboard Card View**

Focus: **Modular cards showing different data types at a glance**

## Layout

```
┌─────────────────────────────────────────────┐
│  ← Back          Jennifer Martinez     ⋮    │
├─────────────────────────────────────────────┤
│                                             │
│         [JM]                                │
│    Jennifer Martinez                        │
│   Creative Design Studio                    │
│   🔵 COLD 28/100    Networking              │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ 🎤 Voice    │ 📸 Screen   │ 🤖 Ask AI │ │
│  │   Note      │   shot      │           │ │
│  └─────────────┴─────────────┴───────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 💡 AI Analysis                        │ │
│  ├───────────────────────────────────────┤ │
│  │ Relationship Status: At Risk 📉        │ │
│  │                                       │ │
│  │ • Last contact: 45 days ago           │ │
│  │ • Typical response time: 2 hours      │ │
│  │ • Best contact time: Tue-Thu 10-2pm   │ │
│  │                                       │ │
│  │ [View Full Analysis ▸]                │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌──────────────┬─────────────────────────┐ │
│  │ 📊 Activity  │  🎯 Next Actions        │ │
│  ├──────────────┤                         │ │
│  │ Last 30d:    │  • Send reconnection    │ │
│  │              │    message              │ │
│  │ 📧 0 emails  │                         │ │
│  │ 📞 0 calls   │  • Schedule followup    │ │
│  │ 🤝 0 meetings│                         │ │
│  │ 📝 2 notes   │  • Update contact info  │ │
│  │              │                         │ │
│  │ [View All ▸] │  [View All ▸]           │ │
│  └──────────────┴─────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 📝 Recent Notes                       │ │
│  ├───────────────────────────────────────┤ │
│  │ Sep 10, 2025                          │ │
│  │ "Discussed new project scope. Budget  │ │
│  │  is $50-75k. Timeline: Q1 2026"       │ │
│  │                                       │ │
│  │ Sep 8, 2025                           │ │
│  │ "Very interested in our services.     │ │
│  │  Wants to see portfolio examples"     │ │
│  │                                       │ │
│  │ [View All Notes ▸]  [+ Add Note]      │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 📎 Files & Documents (3)              │ │
│  ├───────────────────────────────────────┤ │
│  │ 📄 proposal-draft.pdf      2.3 MB     │ │
│  │ 📊 budget-estimate.xlsx    156 KB     │ │
│  │ 🖼️  portfolio-samples.zip   8.1 MB    │ │
│  │                                       │ │
│  │ [View All ▸]  [+ Upload]              │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ ⚡ Quick Actions                       │ │
│  ├───────────────────────────────────────┤ │
│  │ [✉️ Craft Message]  [📞 Schedule Call] │ │
│  │ [📅 Set Reminder]   [🏷️  Edit Tags]    │ │
│  └───────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### Key Features
- **AI Analysis Card** - Insights from `/v1/analysis/:id`
- **Activity Summary Card** - Counts from `/v1/interactions?contact_id=:id`
- **Next Actions Card** - From `/v1/analysis/:id/suggestions`
- **Recent Notes Card** - From `/v1/contacts/:id/notes?limit=2`
- **Files Card** - From `/v1/contacts/:id/files`
- **Quick Actions** - One-tap common tasks

### API Calls on Load
```typescript
// 1. Contact details
GET /v1/contacts/:id

// 2. AI analysis
GET /v1/analysis/:id

// 3. AI suggestions
GET /v1/analysis/:id/suggestions

// 4. Activity summary
GET /v1/interactions?contact_id=:id&limit=100
// Calculate counts on frontend

// 5. Recent notes
GET /v1/contacts/:id/notes?limit=2&sort=created_at:desc

// 6. Files
GET /v1/contacts/:id/files?limit=3
```

---

# Iteration 3: **Action-Focused View**

Focus: **What should I do next with this contact?**

## Layout

```
┌─────────────────────────────────────────────┐
│  ← Back          Jennifer Martinez     ⋮    │
├─────────────────────────────────────────────┤
│         [JM]                                │
│    Jennifer Martinez                        │
│   Creative Design Studio                    │
│                                             │
│   🔵 COLD 28/100  ⚠️ Needs Attention        │
│   Last contact: 45 days ago                 │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🤖 AI Recommendations                      │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 1. Send Reconnection Message 💬        │ │
│  │                                       │ │
│  │   "Hi Jennifer, hope you're doing..." │ │
│  │                                       │ │
│  │   [📝 Edit & Send]  [✨ Regenerate]    │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 2. Schedule Follow-up Call 📞          │ │
│  │                                       │ │
│  │   Best time: Tue-Thu, 10am-2pm        │ │
│  │   Suggested topic: "Project timeline" │ │
│  │                                       │ │
│  │   [📅 Schedule]  [⏭️  Skip]            │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 3. Update Contact Information 📝       │ │
│  │                                       │ │
│  │   Missing: LinkedIn URL, phone        │ │
│  │   Last updated: 90 days ago           │ │
│  │                                       │ │
│  │   [✏️  Update]  [⏭️  Skip]             │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 💡 More Ideas                         │ │
│  │ • Share portfolio update              │ │
│  │ • Send birthday greeting (Nov 15)     │ │
│  │ • Request testimonial                 │ │
│  │                                       │ │
│  │ [View All Suggestions ▸]              │ │
│  └───────────────────────────────────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Quick Stats                             │
│                                             │
│  Total interactions: 4                      │
│  Avg response time: 2 hours                 │
│  Last interaction: Email, 45 days ago       │
│  Conversion status: Initial Contact         │
│                                             │
│  [View Full History ▸]                      │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ⚡ Quick Actions                            │
│                                             │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ 📧 Email    │ 📞 Call     │ 📝 Note   │ │
│  └─────────────┴─────────────┴───────────┘ │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ 🎤 Voice    │ 📸 Screen   │ 🤖 Ask AI │ │
│  └─────────────┴─────────────┴───────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📌 Pinned Note                             │
│  "Budget: $50-75k. Timeline: Q1 2026.       │
│   Decision maker, needs portfolio"          │
│                                             │
│  [View All Notes ▸]                         │
│                                             │
└─────────────────────────────────────────────┘
```

### Key Features
- **AI-Generated Action Items** - Prioritized next steps (`GET /v1/analysis/:id/suggestions`)
- **Pre-written Messages** - AI compose suggestions (`POST /v1/compose?contact_id=:id`)
- **One-tap Actions** - Execute suggestions directly
- **Quick Stats** - Key metrics at a glance
- **Pinned Notes** - Important context always visible
- **Minimal Clutter** - Focus on what matters

### API Calls on Load
```typescript
// 1. Contact details
GET /v1/contacts/:id

// 2. AI suggestions (primary feature!)
GET /v1/analysis/:id/suggestions

// 3. Generate suggested message
POST /v1/compose
{
  "context": "reconnection",
  "contact_id": ":id",
  "tone": "friendly"
}

// 4. Get interaction summary
GET /v1/interactions?contact_id=:id&limit=100
// Calculate stats on frontend

// 5. Get pinned notes
GET /v1/contacts/:id/notes?pinned=true&limit=1
```

---

## Comparison Matrix

| Feature | Current | Iteration 1 (Timeline) | Iteration 2 (Dashboard) | Iteration 3 (Action) |
|---------|---------|----------------------|------------------------|---------------------|
| **Interaction History** | ❌ | ✅ Full timeline | ⚠️ Summary only | ⚠️ Stats only |
| **AI Insights** | ❌ | ✅ At top | ✅ Dedicated card | ✅ Primary focus |
| **Action Suggestions** | ❌ | ✅ In insights | ✅ Next Actions card | ✅ Prioritized list |
| **Notes Visible** | ❌ | ⚠️ In timeline | ✅ Recent notes | ✅ Pinned note |
| **Files/Docs** | ❌ | ❌ | ✅ Files card | ❌ |
| **Quick Actions** | ✅ 3 buttons | ✅ Top bar | ✅ Bottom bar | ✅ Grid |
| **Communication Channels** | ❌ | ✅ Listed | ❌ | ❌ |
| **Warmth Trend** | ❌ | ✅ 7-day change | ❌ | ❌ |
| **AI Message Generation** | ✅ "Craft Message" | ✅ Compose button | ✅ Compose button | ✅ Inline preview |
| **Page Scroll Length** | Short | Long | Medium | Medium |
| **Information Density** | Low | High | Medium | Low (focused) |
| **Best For** | Quick view | Researchers | Power users | Action-takers |

---

## Implementation Priority

### Phase 1: Essential Data (All Iterations)
```typescript
// Core contact page hook
export function useContactDetail(contactId: string) {
  // 1. Contact details
  const contact = useQuery(['contact', contactId], () => 
    apiFetch(`/api/v1/contacts/${contactId}`)
  );
  
  // 2. Recent interactions
  const interactions = useQuery(['interactions', contactId], () =>
    apiFetch(`/api/v1/interactions?contact_id=${contactId}&limit=10`)
  );
  
  // 3. AI analysis
  const analysis = useQuery(['analysis', contactId], () =>
    apiFetch(`/api/v1/analysis/${contactId}`)
  );
  
  return { contact, interactions, analysis };
}
```

### Phase 2: Extended Features (Iteration 2 & 3)
```typescript
// Additional queries for richer views
const notes = useQuery(['notes', contactId], () =>
  apiFetch(`/api/v1/contacts/${contactId}/notes?limit=5`)
);

const files = useQuery(['files', contactId], () =>
  apiFetch(`/api/v1/contacts/${contactId}/files`)
);

const suggestions = useQuery(['suggestions', contactId], () =>
  apiFetch(`/api/v1/analysis/${contactId}/suggestions`)
);
```

### Phase 3: Real-time Updates
```typescript
// Realtime subscriptions for live updates
const { data } = useRealtimeQuery(['contact', contactId], {
  channel: `contact:${contactId}`,
  events: ['interaction.created', 'note.created', 'warmth.updated']
});
```

---

## Recommended Approach

### Start with **Iteration 3 (Action-Focused)**
**Why?**
1. ✅ **Solves the "so what?" problem** - Users immediately know what to do
2. ✅ **Leverages AI heavily** - Makes AI suggestions the hero
3. ✅ **Quick wins** - One-tap execution of suggestions
4. ✅ **Less development** - Fewer components than Iteration 2
5. ✅ **Better UX** - Focused, not overwhelming

### Then add **Iteration 1 (Timeline)** as "History" tab
- Users who want details can dive deeper
- Full timeline doesn't clutter main view
- Satisfies power users who need history

### Save **Iteration 2 (Dashboard)** for "Contact 360" view
- Optional advanced view
- For team collaboration/CRM power users
- All data in one place

---

## Example Usage Pattern

```typescript
// Contact Detail Page
export default function ContactDetailScreen({ route }) {
  const { contactId } = route.params;
  const { contact, analysis, suggestions } = useContactDetail(contactId);

  return (
    <ScrollView>
      {/* Header */}
      <ContactHeader contact={contact.data} />
      
      {/* AI Suggestions (Iteration 3 style) */}
      <AISuggestionsSection 
        suggestions={suggestions.data} 
        contactId={contactId}
      />
      
      {/* Quick Stats */}
      <QuickStatsSection contact={contact.data} />
      
      {/* Quick Actions */}
      <QuickActionsGrid contactId={contactId} />
      
      {/* Tabs for more */}
      <Tabs>
        <Tab label="History">
          <InteractionTimeline contactId={contactId} />
        </Tab>
        <Tab label="Notes">
          <NotesView contactId={contactId} />
        </Tab>
        <Tab label="Files">
          <FilesView contactId={contactId} />
        </Tab>
      </Tabs>
    </ScrollView>
  );
}
```

---

## Next Steps

1. ✅ Review these 3 iterations
2. ✅ Choose preferred direction
3. ✅ I'll implement the selected design
4. ✅ Wire up backend endpoints
5. ✅ Add loading states and error handling
6. ✅ Test with real data

Which iteration would you like to start with? 🚀
