# Agent Test: Analyze Contact

- **Contact**: 62884919-e820-4397-8810-391fa6b1ed5d (Agent Analyze 2aa6a600)

## Input
```json
{
  "contact_id": "62884919-e820-4397-8810-391fa6b1ed5d",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze 2aa6a600: Relationship Intelligence Reference Guide**

**Relationship Overview:**
- **Contact Name:** Agent Analyze 2aa6a600
- **Email:** agentanalyze2aa6a600.agent-@example.com
- **Company:** Not specified
- **Tags:** agent_test
- **Warmth Level:** 0 (No established warmth)
- **Last Interaction:** Not recorded
- **Notes:** No additional notes provided

**Key Topics and Interests:**
- **Primary Focus:** Business-related topics, as inferred from the persona note tag.
- **Specific Interests:** Not explicitly stated, but likely aligned with analytical and business contexts due to the nature of the agent's designation and tags.

**Communication Patterns:**
- **Email Usage:** Primary mode of contact is via email. No phone interactions recorded.
- **Response Patterns:** Currently, there is no data on response patterns or frequency of engagement.
- **Interaction Level:** No previous interactions recorded, indicating a need to establish initial contact and build rapport.

**Important Context from Voice Notes:**
- **Persona Note Title:** A-Note 2aa6a6
- **Content Summary:** Provides context for Agent Analyze 2aa6a600 as of October 11, 2025. It's tagged with "business," sugge
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true