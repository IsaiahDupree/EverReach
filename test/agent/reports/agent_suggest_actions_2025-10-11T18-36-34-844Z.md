# Agent Test: Suggest Actions

- **Contact**: 2d2594b7-6822-4bfe-9f60-9cc9f14bbce5 (Agent Suggest 8e848f6c)

## Inputs
### Global payload
```json
{
  "context": "dashboard",
  "focus": "all",
  "limit": 3
}
```
### Per-contact payload
```json
{
  "context": "contact_view",
  "contact_id": "2d2594b7-6822-4bfe-9f60-9cc9f14bbce5",
  "focus": "engagement",
  "limit": 3
}
```

## Outputs
### Global response
```json
{
  "context": "dashboard",
  "focus": "all",
  "suggestions": [
    {
      "action_title": "Engage with Recent Persona Notes",
      "description": "Review and reach out to contacts related to your recent persona notes to deepen engagement and identify potential collaboration opportunities. This will help you leverage insights from your notes effectively.",
      "priority": "high",
      "contacts_involved": [],
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Network with Business Agents",
      "description": "Connect with agents tagged in your recent notes to expand your professional network. Engaging with them can lead to valuable partnerships and knowledge sharing.",
      "priority": "medium",
      "contacts_involved": [],
      "estimated_time_investment": "1 hour"
    },
    {
      "action_title": "Follow-Up on Previous Interactions",
      "description": "Identify any previous interactions that may require follow-up, especially with those who have business interests aligned with your recent persona notes. This will ensure you maintain strong relationships and stay top-of-mind.",
      "priority": "high",
      "contacts_involved": [],
      "estimated_time_investment": "45 minutes"
    }
  ],
  "generated_at": "2025-10-11T18:36:29.931Z",
  "usage": {
    "prompt_tokens": 406,
    "completion_tokens": 249,
    "total_tokens": 655,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "audio_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "audio_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0
    }
  }
}
```
### Per-contact response
```json
{
  "context": "contact_view",
  "focus": "engagement",
  "suggestions": [
    {
      "action_title": "Initiate a Follow-Up Message",
      "description": "Reaching out to Agent Suggest 8e848f6c after a period of no communication can help to re-establish the relationship and demonstrate your interest in their work.",
      "priority": "high",
      "contact": {
        "display_name": "Agent Suggest 8e848f6c"
      },
      "estimated_time_investment": "15 minutes"
    },
    {
      "action_title": "Share Relevant Industry Insights",
      "description": "Sending valuable information or insights related to their business can position you as a knowledgeable resource and strengthen your connection.",
      "priority": "medium",
      "contact": {
        "display_name": "Agent Suggest 8e848f6c"
      },
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Schedule a Casual Check-In Call",
      "description": "A casual call can foster a more personal connection and provide an opportunity to discuss mutual interests or potential collaborations.",
      "priority": "medium",
      "contact": {
        "display_name": "Agent Suggest 8e848f6c"
      },
      "estimated_time_investment": "20 minutes"
    }
  ],
  "generated_at": "2025-10-11T18:36:35.521Z",
  "usage": {
    "prompt_tokens": 486,
    "completion_tokens": 277,
    "total_tokens": 763,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "audio_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "audio_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0
    }
  }
}
```

## Assertions
- **Global returned suggestions[]**: true
- **Per-contact returned suggestions[]**: true
- **PASS**: true