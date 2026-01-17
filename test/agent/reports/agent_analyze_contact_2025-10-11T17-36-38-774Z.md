# Agent Test: Analyze Contact

- **Contact**: 0bc7f59a-5d61-4b31-9425-0970b33d1bd7 (Agent Analyze 97f4673b)

## Input
```json
{
  "contact_id": "0bc7f59a-5d61-4b31-9425-0970b33d1bd7",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze 97f4673b Relationship Overview**

- **Name**: Agent Analyze 97f4673b
- **Email**: agentanalyze97f4673b.agent-@example.com
- **Company**: Not specified
- **Tags**: Agent Test
- **Warmth**: 0 (No current warmth level indicated)
- **Last Interaction**: Not recorded
- **Notes**: No specific notes available

**Key Topics and Interests**

- **Business Context**: The primary tag associated with Agent Analyze 97f4673b is "business," indicating a focus or interest in business-related topics. This may suggest that future interactions should be framed within a professional or business context.

**Communication Patterns**

- **Emails**: The primary mode of contact is via email. No phone numbers or other communication channels are listed, suggesting reliance on email for any direct communication.
- **Interactions**: Currently, there are no recorded interactions, indicating either a new relationship or a lack of engagement to date.

**Important Context from Voice Notes**

- **Persona Notes**: The only available note is titled "A-Note 97f467," created on October 11, 2025. This note is tagged with "business," reinforcing the business orientation of this contact. No specific content
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true