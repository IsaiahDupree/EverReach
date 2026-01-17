# Agent Test: Suggest Actions

- **Contact**: dc8c70c8-2d2f-4072-b775-55a940f6553b (Agent Suggest 3d50ba8e)

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
  "contact_id": "dc8c70c8-2d2f-4072-b775-55a940f6553b",
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
      "action_title": "Engage with Recent Business Notes",
      "description": "Review and follow up on the insights from your recent persona notes to identify potential collaboration opportunities or updates with your business contacts.",
      "priority": "high",
      "contacts_involved": [],
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Network with Business Agents",
      "description": "Reach out to your business agents tagged in the recent notes to strengthen your network and explore synergies that could benefit your projects.",
      "priority": "medium",
      "contacts_involved": [
        "Agent PN 00792ae5",
        "Agent Analyze ccdaf971",
        "Agent PN fa317852"
      ],
      "estimated_time_investment": "1 hour"
    },
    {
      "action_title": "Follow Up on Business Opportunities",
      "description": "Identify any actionable items or opportunities mentioned in your recent notes and follow up with relevant contacts to maintain momentum.",
      "priority": "high",
      "contacts_involved": [],
      "estimated_time_investment": "45 minutes"
    }
  ],
  "generated_at": "2025-10-11T17:42:57.292Z",
  "usage": {
    "prompt_tokens": 394,
    "completion_tokens": 250,
    "total_tokens": 644,
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
      "action_title": "Send a Personal Introduction Email",
      "description": "Reach out to Agent Suggest 3d50ba8e with a friendly introduction email to establish rapport and initiate communication. This helps in building warmth and opens the door for future interactions.",
      "priority": "high",
      "contact": {
        "id": "dc8c70c8-2d2f-4072-b775-55a940f6553b",
        "display_name": "Agent Suggest 3d50ba8e"
      },
      "estimated_time_investment": "20 minutes"
    },
    {
      "action_title": "Schedule a Follow-Up Call",
      "description": "Arrange a call to discuss potential collaboration or shared interests, referencing your recent persona notes. This personal touch can significantly enhance relationship engagement.",
      "priority": "medium",
      "contact": {
        "id": "dc8c70c8-2d2f-4072-b775-55a940f6553b",
        "display_name": "Agent Suggest 3d50ba8e"
      },
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Share Relevant Business Insights",
      "description": "Send a brief message or article related to the business topics mentioned in your persona notes. This positions you as a valuable resource and encourages ongoing dialogue.",
      "priority": "medium",
      "contact": {
        "id": "dc8c70c8-2d2f-4072-b775-55a940f6553b",
        "display_name": "Agent Suggest 3d50ba8e"
      },
      "estimated_time_investment": "15 minutes"
    }
  ],
  "generated_at": "2025-10-11T17:43:09.700Z",
  "usage": {
    "prompt_tokens": 472,
    "completion_tokens": 380,
    "total_tokens": 852,
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