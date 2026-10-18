# Agent Test: Analyze Contact

- **Contact**: d56afb9b-9d21-439d-ae01-31eeca95cd59 (Agent Analyze e9b5483d)

## Input
```json
{
  "contact_id": "d56afb9b-9d21-439d-ae01-31eeca95cd59",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze e9b5483d: Relationship Intelligence Reference Guide**

---

**Relationship Overview:**

- **Name:** Agent Analyze e9b5483d
- **Email:** agentanalyzee9b5483d.agent-@example.com
- **Company:** Not specified
- **Tags:** Agent Test
- **Relationship Warmth:** Cold (0 warmth score)
- **Last Interaction:** No recorded interactions

**Key Topics and Interests:**

- The primary tag associated with Agent Analyze e9b5483d is "business," indicating a potential focus on professional or business-related topics.

**Communication Patterns:**

- **Email Only:** The primary mode of contact is through email, as no phone numbers or other communication channels are provided.
- **No Recorded Interactions:** There are currently no past interactions recorded, which suggests a need for initial engagement strategies to warm up the relationship.

**Important Context from Voice Notes:**

- **Persona Note:** A note titled "A-Note e9b548" was created on November 21, 2025, indicating some level of context was established on that date. However, the content of the note is not detailed beyond the timestamp and tags.

**Best Practices for Engaging:**

1. **Initiate Contact via Email:** Given the abse
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true