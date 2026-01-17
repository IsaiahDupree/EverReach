# Agent Test: Analyze Contact

- **Contact**: 7219126d-bf17-4370-9345-cb51f53104eb (Agent Analyze 649f06ab)

## Input
```json
{
  "contact_id": "7219126d-bf17-4370-9345-cb51f53104eb",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze 649f06ab Relationship Reference Guide**

**Relationship Overview:**
- **Name:** Agent Analyze 649f06ab
- **Email:** agentanalyze649f06ab.agent-@example.com
- **Tags:** agent_test
- **Warmth Level:** Cold (no interactions recorded)
- **Last Interaction:** None recorded

**Key Topics and Interests:**
- The only available note suggests an association with business contexts, as indicated by the tag "business" in the persona note titled "A-Note 649f06."

**Communication Patterns:**
- Currently, there are no recorded interactions or communication patterns with Agent Analyze 649f06ab. This indicates a need to initiate contact and build rapport.

**Important Context from Voice Notes:**
- There are no voice notes or detailed content provided beyond the text note titled "A-Note 649f06," which references business but lacks specific details.

**Best Practices for Engaging with Agent Analyze 649f06ab:**
1. **Initiate Contact:** Since the relationship is cold with no previous interactions, initiate contact through a personalized email that references the business context.
2. **Establish Relevance:** Highlight any mutual business interests or potential benefits of engaging, given 
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true