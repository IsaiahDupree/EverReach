# Agent Test: Analyze Contact

- **Contact**: 962eeb24-52e1-488b-af42-bbf40cfc276b (Agent Analyze 04bbc8b7)

## Input
```json
{
  "contact_id": "962eeb24-52e1-488b-af42-bbf40cfc276b",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
### Reference Guide for Agent Analyze 04bbc8b7

#### Relationship Overview
Agent Analyze 04bbc8b7 is a contact primarily associated with the "agent_test" tag, indicating a possible role in testing or analysis within a business context. There is no current company affiliation or personal warmth data available, suggesting limited personal engagement or a professional-only relationship.

#### Key Topics and Interests
- **Business Analysis**: The presence of the "business" tag in persona notes implies an interest or role in business analysis or related activities.
- **Testing and Evaluation**: The "agent_test" tag suggests a focus on testing, possibly within analytical or software environments.

#### Communication Patterns
- **Email as Primary Channel**: The contact has only been identified through their email address, indicating email is the primary or sole channel for communication.
- **No Documented Interactions**: There are currently no recorded interactions, which suggests either a new or inactive relationship.

#### Important Context from Voice Notes
- **Business Context**: The persona note titled "A-Note 04bbc8" is tagged with "business," reinforcing the professional context of 
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true