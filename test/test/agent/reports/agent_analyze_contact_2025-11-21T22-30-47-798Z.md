# Agent Test: Analyze Contact

- **Contact**: 08c14717-4cb2-480c-81fe-918839f447a1 (Agent Analyze b31c2a71)

## Input
```json
{
  "contact_id": "08c14717-4cb2-480c-81fe-918839f447a1",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze b31c2a71: Relationship Reference Guide**

**Relationship Overview:**
- Name: Agent Analyze b31c2a71
- Email: agentanalyzeb31c2a71.agent-@example.com
- Current Warmth: Cold (0 on the warmth scale)
- Tags: agent_test
- Last Interaction: None recorded
- Company: Not specified

**Key Topics and Interests:**
- Business-focused context as indicated by the tags associated with the persona notes.
- No specific personal interests or topics have been identified from the data available.

**Communication Patterns:**
- No interactions have been recorded, suggesting either a new contact or a contact with whom engagement has not yet been initiated.
- The communication is currently limited to email, with no phone interactions or other forms of contact.

**Important Context from Voice Notes:**
- The only note available is titled "A-Note b31c2a," which mentions business but lacks detailed content.
- The note was created on November 21, 2025, indicating recent attention or relevance.

**Best Practices for Engaging with Agent Analyze b31c2a71:**
1. **Initiate Contact via Email:** Since email is the only provided contact method, start the engagement through this channel.
2. **Focus on B
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true