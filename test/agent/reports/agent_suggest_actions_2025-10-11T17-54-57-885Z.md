# Agent Test: Suggest Actions

- **Contact**: 2ffa37ba-49fe-471c-b651-bdaa56936887 (Agent Suggest ee555a2a)

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
  "contact_id": "2ffa37ba-49fe-471c-b651-bdaa56936887",
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
      "description": "Review and follow up on the recent persona notes you've created. Engaging with these insights can help strengthen your relationships and identify opportunities for collaboration or support.",
      "priority": "high",
      "contacts_involved": [],
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Network with Business Agents",
      "description": "Connect with the agents mentioned in your persona notes. They may provide valuable insights or connections that could benefit your business. A personal outreach can enhance your professional network.",
      "priority": "medium",
      "contacts_involved": [
        "Agent PN 472cdeb4",
        "Agent Analyze 04bbc8b7",
        "Agent PN 00792ae5"
      ],
      "estimated_time_investment": "1 hour"
    },
    {
      "action_title": "Schedule Follow-Up Meetings",
      "description": "Plan follow-up meetings with key contacts in your network to discuss ongoing projects or explore new opportunities. This proactive approach shows your commitment to maintaining strong relationships.",
      "priority": "medium",
      "contacts_involved": [],
      "estimated_time_investment": "1 hour"
    }
  ],
  "generated_at": "2025-10-11T17:54:52.702Z",
  "usage": {
    "prompt_tokens": 399,
    "completion_tokens": 274,
    "total_tokens": 673,
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
      "action_title": "Initiate First Contact",
      "description": "Reach out to Agent Suggest ee555a2a to introduce yourself and express your interest in their work. Establishing a connection is crucial for building rapport and increasing warmth in the relationship.",
      "priority": "high",
      "contacts_involved": [
        "Agent Suggest ee555a2a"
      ],
      "estimated_time_investment": "10 minutes"
    },
    {
      "action_title": "Share Relevant Insights",
      "description": "Send a brief email or message sharing insights or resources related to their business area. This demonstrates your value and knowledge, fostering a sense of collaboration and engagement.",
      "priority": "medium",
      "contacts_involved": [
        "Agent Suggest ee555a2a"
      ],
      "estimated_time_investment": "15 minutes"
    },
    {
      "action_title": "Schedule a Follow-Up Meeting",
      "description": "Propose a casual meeting or coffee chat to discuss mutual interests and explore potential collaboration. Personal interactions can significantly enhance relationship depth.",
      "priority": "medium",
      "contacts_involved": [
        "Agent Suggest ee555a2a"
      ],
      "estimated_time_investment": "30 minutes"
    }
  ],
  "generated_at": "2025-10-11T17:54:58.495Z",
  "usage": {
    "prompt_tokens": 468,
    "completion_tokens": 277,
    "total_tokens": 745,
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