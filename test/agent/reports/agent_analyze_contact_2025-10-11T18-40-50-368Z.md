# Agent Test: Analyze Contact

- **Contact**: ac658ba6-972e-454e-b4de-339174848b27 (Agent Analyze d5595e27)

## Input
```json
{
  "contact_id": "ac658ba6-972e-454e-b4de-339174848b27",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Reference Guide for Agent Analyze d5595e27**

**Relationship Overview:**
- Agent Analyze d5595e27 is a contact primarily identified by the email "agentanalyzed5595e27.agent-@example.com."
- There is currently no company affiliation or personal phone number associated with this contact.
- The relationship warmth is currently at a baseline level (0), indicating no recent interactions or established rapport.

**Key Topics and Interests:**
- The primary interest identified is business-related, as indicated by the tags associated with the persona notes.
- Further detailed interests are not available due to the lack of recorded interactions or additional contextual information.

**Communication Patterns:**
- No historical interactions have been recorded, suggesting that any communication with Agent Analyze d5595e27 is either nascent or has yet to be initiated.
- There are no identified preferred communication channels or frequency patterns.

**Important Context from Voice Notes:**
- The only available persona note is titled "A-Note d5595e," which provides a timestamped context reference but lacks detailed content.
- The note is tagged with "business," suggesting that future engagements
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true