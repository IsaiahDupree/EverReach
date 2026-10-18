# Agent Test: Analyze Contact

- **Contact**: d9ae8a12-597a-4f8a-bd4b-34eeb1f3c3a5 (Agent Analyze 5cf84a46)

## Input
```json
{
  "contact_id": "d9ae8a12-597a-4f8a-bd4b-34eeb1f3c3a5",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze 5cf84a46 Relationship Reference Guide**

**Relationship Overview:**
- **Contact Name:** Agent Analyze 5cf84a46
- **Email:** agentanalyze5cf84a46.agent-@example.com
- **Phone:** Not available
- **Company:** Not specified
- **Tags:** agent_test
- **Warmth Level:** Cold (No interactions recorded)
- **Last Interaction:** None recorded

**Key Topics and Interests:**
- **Primary Tag:** Business (as indicated by persona notes)
- **Specific Interests:** Currently, only general business context is noted. Further interactions may reveal more specific interests.

**Communication Patterns:**
- **Email:** Primary mode of contact due to lack of phone number.
- **Interaction Frequency:** No interactions have been recorded. This suggests either a new contact or a need for initial engagement strategies.
- **Communication Style:** Unknown; requires initial engagement to determine.

**Important Context from Voice Notes:**
- **Persona Note:** A single text note titled "A-Note 5cf84a" was recorded on November 21, 2025. It mentions "Context for Agent Analyze 5cf84a46" with a business tag, indicating a focus on business-related topics. No additional details were provided.

**Best Practice
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true