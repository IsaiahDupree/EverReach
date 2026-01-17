# Agent Test: Analyze Contact

- **Contact**: da367956-ff75-414c-b4f7-98891138e98c (Agent Analyze ee98dd0d)

## Input
```json
{
  "contact_id": "da367956-ff75-414c-b4f7-98891138e98c",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze ee98dd0d: Relationship Overview**

- **Name:** Agent Analyze ee98dd0d
- **Email:** agentanalyzeee98dd0d.agent-@example.com
- **Company:** Not specified
- **Tags:** agent_test
- **Warmth Level:** Cold
- **Last Interaction:** None recorded
- **Notes:** None available

**Key Topics and Interests**

- **Primary Interest:** Business-related topics (as inferred from the persona note tag)
- **Specific Interests:** Not explicitly detailed, but likely involves analytical or agent-related activities given the name and context

**Communication Patterns**

- **Current Interaction Level:** No interactions have been recorded, indicating no established communication pattern
- **Preferred Contact Method:** Email (as no phone details are available)
- **Response Patterns:** Not available due to lack of historical data

**Important Context from Voice Notes**

- **Note Title:** A-Note ee98dd
- **Content Summary:** A context note created on November 21, 2025, suggesting a focus on business matters. No additional voice notes or detailed content provided.

**Best Practices for Engaging with Agent Analyze ee98dd0d**

1. **Initiate Contact via Email:** Given the absence of phone contact det
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true