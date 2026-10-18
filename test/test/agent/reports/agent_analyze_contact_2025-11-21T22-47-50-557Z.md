# Agent Test: Analyze Contact

- **Contact**: b6bd3973-9c39-4a5b-a707-7dc415700ea0 (Agent Analyze 71b05da3)

## Input
```json
{
  "contact_id": "b6bd3973-9c39-4a5b-a707-7dc415700ea0",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze 71b05da3: Relationship Reference Guide**

**Relationship Overview:**
Agent Analyze 71b05da3 is currently a cold contact with no recorded interactions or established relationship history. There is no known company affiliation, and the contact is tagged primarily as "agent_test," indicating a focus on testing or evaluation within a business context.

**Key Topics and Interests:**
- Business Context: The only available note tagged with "business" suggests a professional or commercial interest, though specifics are lacking.
- Testing and Analysis: The "agent_test" tag implies a focus on testing, evaluation, or analytical processes.

**Communication Patterns:**
- No current communication patterns are established due to the absence of past interactions.
- The contact has provided an email address but no phone number, indicating a preference or limitation to email communication.

**Important Context from Voice Notes:**
- There are no voice notes available for this contact, limiting insights into tone or additional context that might be gleaned from spoken interactions.

**Best Practices for Engaging with Agent Analyze 71b05da3:**
1. **Initial Contact via Email:** Given the
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true