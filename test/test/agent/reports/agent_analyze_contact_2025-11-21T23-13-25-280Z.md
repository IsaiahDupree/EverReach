# Agent Test: Analyze Contact

- **Contact**: 2cc57d38-9641-461b-b603-509b8f568459 (Agent Analyze b8022a62)

## Input
```json
{
  "contact_id": "2cc57d38-9641-461b-b603-509b8f568459",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
### Agent Analyze b8022a62 Relationship Reference Guide

#### Relationship Overview
- **Name:** Agent Analyze b8022a62
- **Contact Information:** Email - agentanalyzeb8022a62.agent-@example.com
- **Company:** Not specified
- **Tags:** Agent Test
- **Warmth Level:** Cold (No recent interactions or established relationship)
- **Last Interaction:** No recorded interactions

#### Key Topics and Interests
- **Focus Areas:** Business-related topics are indicated by the tags and note content.
- **Potential Interests:** As the note is tagged with "business," it's likely that discussions around business analysis, intelligence, or strategy might be relevant.

#### Communication Patterns
- **Current Engagement:** No phone contact details or past interactions are available, indicating potential for initial engagement.
- **Preferred Channels:** Email is the primary mode of contact, suggesting that written communication might be the most effective initial approach.

#### Important Context from Voice Notes
- **Persona Note:** A note titled "A-Note b8022a" suggests a context or framework related to Agent Analyze b8022a62, tagged with "business." This indicates a business-centric focus in their pro
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true