# Agent Test: Suggest Actions

- **Contact**: 7a4c14e2-1ee3-4ee6-b245-c994b8148b20 (Agent Suggest 8fe178f5)

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
  "contact_id": "7a4c14e2-1ee3-4ee6-b245-c994b8148b20",
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
      "action_title": "Engage with Business Agents",
      "description": "Reach out to your recent contacts tagged as business agents to strengthen relationships and explore potential collaboration opportunities. Engaging with these contacts can lead to new insights and business growth.",
      "priority": "high",
      "contacts_involved": [
        "Agent PN fa317852",
        "Agent Analyze 97f4673b",
        "Agent PN c54b4391"
      ],
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Schedule Follow-Up Meetings",
      "description": "Set up follow-up meetings with your business agents to discuss recent projects or updates. This will help maintain momentum in your relationships and ensure that you stay informed about their needs and offerings.",
      "priority": "medium",
      "contacts_involved": [
        "Agent PN fa317852",
        "Agent Analyze 97f4673b",
        "Agent PN c54b4391"
      ],
      "estimated_time_investment": "1 hour"
    },
    {
      "action_title": "Network at Upcoming Events",
      "description": "Identify and attend networking events relevant to your business interests. Engaging with a broader network can introduce you to new opportunities and enhance your existing relationships.",
      "priority": "medium",
      "contacts_involved": [],
      "estimated_time_investment": "2 hours"
    }
  ],
  "generated_at": "2025-10-11T17:37:12.842Z",
  "usage": {
    "prompt_tokens": 396,
    "completion_tokens": 309,
    "total_tokens": 705,
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
      "action_title": "Send a Personalized Follow-Up Email",
      "description": "Reaching out to Agent Suggest 8fe178f5 with a personalized email can help initiate engagement. Since there have been no recent interactions, this is a great way to show interest and open communication lines.",
      "priority": "high",
      "contacts_involved": [
        "Agent Suggest 8fe178f5"
      ],
      "estimated_time_investment": "15 minutes"
    },
    {
      "action_title": "Share Relevant Industry Insights",
      "description": "Providing Agent Suggest 8fe178f5 with valuable insights or resources related to their business can help build rapport and establish you as a knowledgeable contact. This can encourage future conversations.",
      "priority": "medium",
      "contacts_involved": [
        "Agent Suggest 8fe178f5"
      ],
      "estimated_time_investment": "30 minutes"
    },
    {
      "action_title": "Schedule a Quick Introductory Call",
      "description": "Setting up a brief call can significantly enhance your relationship by allowing for direct communication. This will help in understanding their needs better and fostering a stronger connection.",
      "priority": "medium",
      "contacts_involved": [
        "Agent Suggest 8fe178f5"
      ],
      "estimated_time_investment": "20 minutes"
    }
  ],
  "generated_at": "2025-10-11T17:37:18.854Z",
  "usage": {
    "prompt_tokens": 473,
    "completion_tokens": 288,
    "total_tokens": 761,
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