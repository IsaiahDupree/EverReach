# AI Analysis API

Get AI-powered insights about your contacts and relationships using OpenAI.

**Base Endpoint**: `/v1/agent/analyze`

---

## Overview

The AI Analysis endpoint provides:
- **Relationship Health** - Strengths, weaknesses, recommendations
- **Engagement Suggestions** - Specific next actions
- **Context Summaries** - LLM-ready contact briefs
- **Full Analysis** - Comprehensive relationship intelligence

All analysis is based on:
- Contact details and metadata
- Interaction history
- Voice notes and personal context
- Warmth scores and trends

---

## Analyze Contact

Get AI analysis for a specific contact.

```http
POST /v1/agent/analyze/contact
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_id` | UUID | ✅ Yes | Contact to analyze |
| `analysis_type` | string | No | Type of analysis (default: context_summary) |
| `include_voice_notes` | boolean | No | Include persona notes (default: true) |
| `include_interactions` | boolean | No | Include interaction history (default: true) |

### Analysis Types

| Type | Description | Use Case |
|------|-------------|----------|
| `relationship_health` | Health score, strengths, warnings, recommendations | Quarterly reviews, at-risk contacts |
| `engagement_suggestions` | 3-5 specific next actions | Daily planning, re-engagement |
| `context_summary` | Brief overview for quick reference | Before calls, meeting prep |
| `full_analysis` | Comprehensive relationship intelligence | Strategic planning, major accounts |

### Example - Relationship Health

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/agent/analyze/contact',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      analysis_type: 'relationship_health',
      include_voice_notes: true,
      include_interactions: true
    })
  }
);

const { analysis } = await response.json();
```

### Response

```json
{
  "contact": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe"
  },
  "analysis_type": "relationship_health",
  "analysis": "**Relationship Health: 7.5/10**\n\n**Strengths:**\n- Consistent monthly touchpoints over 6 months\n- High engagement in recent calls\n- Mutual value exchange (referrals both ways)\n\n**Warning Signs:**\n- Last interaction was 18 days ago (longer than usual)\n- No response to last 2 emails\n- Warmth score declining (75 → 68)\n\n**Recommendations:**\n1. Schedule a casual check-in call this week\n2. Share relevant industry report you discussed\n3. Invite to upcoming webinar on Q1 trends\n4. Set reminder for quarterly coffee meeting",
  "context_used": {
    "interactions": 15,
    "persona_notes": 3
  },
  "usage": {
    "prompt_tokens": 1250,
    "completion_tokens": 320,
    "total_tokens": 1570
  }
}
```

---

## Analysis Types in Detail

### 1. Relationship Health

**Best for**: Understanding overall relationship status

**Output includes**:
- Health score (1-10)
- Key relationship strengths
- Warning signs or red flags
- Specific actionable recommendations

**Example Request**:
```typescript
{
  "contact_id": "uuid",
  "analysis_type": "relationship_health"
}
```

**Sample Output**:
```
Health Score: 8/10

Strengths:
- Strong 2-year relationship with regular contact
- High mutual trust and reciprocity
- Active champion for your products

Warning Signs:
- Slight decrease in response time recently
- No face-to-face meeting in 4 months

Recommendations:
1. Schedule in-person lunch next month
2. Send personalized thank you for recent referral
3. Invite to exclusive customer advisory board
```

---

### 2. Engagement Suggestions

**Best for**: Daily planning and re-engagement

**Output includes**:
- 3-5 specific next actions
- Personalized to contact's context
- Appropriately timed recommendations
- Channel suggestions (email/call/meeting)

**Example Request**:
```typescript
{
  "contact_id": "uuid",
  "analysis_type": "engagement_suggestions"
}
```

**Sample Output**:
```
Suggested Actions:

1. **Send Case Study Email** (Priority: High)
   - John mentioned interest in AI automation
   - Share recent case study from similar company
   - Channel: Email
   - Timing: This week

2. **Schedule Q1 Planning Call** (Priority: Medium)
   - It's been 3 weeks since last call
   - Discuss upcoming product launches
   - Channel: Video call
   - Timing: Next 10 days

3. **LinkedIn Engagement** (Priority: Low)
   - Comment on his recent post about industry trends
   - Channel: LinkedIn
   - Timing: Opportunistic
```

---

### 3. Context Summary

**Best for**: Quick prep before calls or meetings

**Output includes**:
- Relationship overview
- Key topics and interests
- Recent interaction highlights
- Communication preferences

**Example Request**:
```typescript
{
  "contact_id": "uuid",
  "analysis_type": "context_summary"
}
```

**Sample Output**:
```
John Doe - VP Engineering at Acme Inc

Relationship: 18-month customer, warm relationship (Warmth: 72/100)

Key Context:
- Primary point of contact for enterprise account
- Technical decision-maker, values ROI and efficiency
- Interested in: AI/ML, automation, developer tools
- Communication style: Direct, data-driven, prefers email

Recent Activity:
- Last contact: Demo call 12 days ago
- Discussed: Q1 roadmap, API improvements
- Next steps: Follow up on pricing proposal

Best Practices:
- Lead with technical details, not sales pitch
- Reference specific metrics and case studies
- Keep meetings focused and time-boxed
```

---

### 4. Full Analysis

**Best for**: Strategic planning, major accounts

**Output includes**:
- Complete relationship assessment
- Engagement history and patterns
- Strategic recommendations
- Long-term relationship strategy

**Example Request**:
```typescript
{
  "contact_id": "uuid",
  "analysis_type": "full_analysis"
}
```

**Sample Output**:
```
Comprehensive Analysis: John Doe

1. RELATIONSHIP HEALTH (8.5/10)
   [Detailed health assessment...]

2. ENGAGEMENT PATTERNS
   - Primary channel: Email (65%), Calls (25%), Meetings (10%)
   - Response time: Avg 4 hours (very engaged)
   - Best days: Tuesday-Thursday mornings
   - Topics: Product features, technical architecture, ROI

3. KEY INSIGHTS
   - Strong advocate within Acme Inc
   - Influenced 3 team expansions
   - Concerns about pricing transparency
   
4. STRATEGIC RECOMMENDATIONS
   Short-term (30 days):
   - Address pricing concerns with custom proposal
   - Schedule executive intro call
   
   Medium-term (90 days):
   - Develop case study featuring Acme
   - Invite to customer advisory board
   
   Long-term (1 year):
   - Explore partnership opportunities
   - Co-marketing initiatives

5. RISK FACTORS
   - Recent budget cuts at Acme (monitor renewal)
   - Competitor outreach detected (via LinkedIn activity)
```

---

## Common Patterns

### Pre-Call Preparation

```typescript
// Get quick context before important call
const { analysis } = await fetch(
  '/v1/agent/analyze/contact',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact_id: contactId,
      analysis_type: 'context_summary'
    })
  }
).then(r => r.json());

console.log('Call prep notes:', analysis);
```

### Weekly Relationship Review

```typescript
// Analyze all VIP contacts weekly
const vips = await fetch('/v1/contacts?tag=vip', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

for (const contact of vips.contacts) {
  const { analysis } = await fetch('/v1/agent/analyze/contact', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact_id: contact.id,
      analysis_type: 'relationship_health'
    })
  }).then(r => r.json());
  
  // Store or email analysis
  console.log(`${contact.display_name}: ${analysis}`);
}
```

### At-Risk Contact Analysis

```typescript
// Get detailed analysis for cooling contacts
const cooling = await fetch('/v1/contacts?warmth_lte=39', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

const analyses = await Promise.all(
  cooling.contacts.map(c =>
    fetch('/v1/agent/analyze/contact', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: c.id,
        analysis_type: 'full_analysis'
      })
    }).then(r => r.json())
  )
);
```

---

## Performance

- **Average latency**: 5-8 seconds (GPT-4o)
- **Faster option**: Use `context_summary` (2-3 seconds)
- **Optimization**: Cache analyses for 24 hours

---

## Cost Considerations

| Analysis Type | Avg Tokens | Approx Cost |
|---------------|------------|-------------|
| context_summary | ~600 tokens | $0.003 |
| engagement_suggestions | ~800 tokens | $0.004 |
| relationship_health | ~1200 tokens | $0.006 |
| full_analysis | ~2000 tokens | $0.010 |

---

## Next Steps

- [AI Compose](./07-ai-compose.md) - Generate personalized messages
- [AI Suggestions](./08-ai-suggestions.md) - Get proactive action items
- [Warmth Scoring](./05-warmth-scoring.md) - Understand relationship metrics
