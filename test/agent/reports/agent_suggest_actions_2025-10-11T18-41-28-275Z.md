# Agent Test: Suggest Actions

- **Contact**: 17314762-e231-4cf7-bf16-2623f346fc0f (Agent Suggest d5dc364e)

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
  "contact_id": "17314762-e231-4cf7-bf16-2623f346fc0f",
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
      "action_title": "Engage with Recent Notes",
      "description": "Review and follow up on the recent persona notes you've created. Engaging with these insights can help strengthen your understanding of key business relationships and identify potential opportunities.",
      "priority": "high",
      "contacts_involved": [],
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Network with Business Agents",
      "description": "Reach out to contacts associated with the tags 'Agent PN 6e228c49' and 'Agent Analyze d5595e27'. Networking with these agents can open new avenues for collaboration and growth in your business.",
      "priority": "medium",
      "contacts_involved": [
        "Agent PN 6e228c49",
        "Agent Analyze d5595e27"
      ],
      "estimated_time_investment": "1 hour"
    },
    {
      "action_title": "Follow Up on PN Insights",
      "description": "Follow up with any relevant contacts related to the persona notes (PN dd1c28) to discuss insights or opportunities that emerged from your analysis. This keeps the conversation active and demonstrates your commitment to collaboration.",
      "priority": "high",
      "contacts_involved": [],
      "estimated_time_investment": "45 minutes"
    }
  ],
  "generated_at": "2025-10-11T18:41:22.683Z",
  "usage": {
    "prompt_tokens": 400,
    "completion_tokens": 284,
    "total_tokens": 684,
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
      "action_title": "Initiate a Check-in Email",
      "description": "Reaching out to Agent Suggest d5dc364e will help break the ice and start building warmth in your relationship. A simple check-in can open the door for future conversations and collaborations.",
      "priority": "high",
      "contact": "Agent Suggest d5dc364e",
      "estimated_time_investment": "15 minutes"
    },
    {
      "action_title": "Share Relevant Business Insights",
      "description": "Sending a brief note or article related to the recent persona notes tagged with 'business' can position you as a valuable resource and stimulate engagement.",
      "priority": "medium",
      "contact": "Agent Suggest d5dc364e",
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Schedule a Follow-up Call",
      "description": "Setting up a call can deepen your connection and allow for a more personal interaction. This is crucial for establishing trust and understanding their needs better.",
      "priority": "medium",
      "contact": "Agent Suggest d5dc364e",
      "estimated_time_investment": "1 hour"
    }
  ],
  "generated_at": "2025-10-11T18:41:28.963Z",
  "usage": {
    "prompt_tokens": 472,
    "completion_tokens": 263,
    "total_tokens": 735,
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