# Agent Test: Analyze Contact

- **Contact**: a28cbfc8-bbfb-4d91-a650-18b00de0f3c9 (Agent Analyze ccdaf971)

## Input
```json
{
  "contact_id": "a28cbfc8-bbfb-4d91-a650-18b00de0f3c9",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze ccdaf971: Relationship Reference Guide**

**Relationship Overview:**
Agent Analyze ccdaf971 is a contact tagged as "agent_test" with minimal interaction history. There is no current warmth level or past interactions recorded, indicating a potential new or inactive relationship. The contact is associated with an email address but lacks phone numbers or company affiliation, suggesting communication primarily occurs via email.

**Key Topics and Interests:**
- The primary tag associated with Agent Analyze ccdaf971 is "business," indicating a professional context for interactions.
- There are no specific interests or topics identified beyond the general business context due to limited data.

**Communication Patterns:**
- Current communication is solely through email, with no phone interactions recorded.
- There is no historical data on communication frequency, response times, or preferred communication styles.

**Important Context from Voice Notes:**
- A single persona note titled "A-Note ccdaf9" was created on October 11, 2025, at 17:42:20 UTC. It references "Context for Agent Analyze ccdaf971" and is tagged with "business," but lacks detailed content to provide further
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true