# Agent Test: Analyze Contact

- **Contact**: 303520fb-ab37-47b0-93cd-c92903fde99f (Agent Analyze a23f935e)

## Input
```json
{
  "contact_id": "303520fb-ab37-47b0-93cd-c92903fde99f",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze a23f935e: Comprehensive Context Summary**

**Relationship Overview:**
- **Contact Name:** Agent Analyze a23f935e
- **Email:** agentanalyzea23f935e.agent-@example.com
- **Tags:** agent_test
- **Relationship Warmth:** Cold (0 warmth rating)
- **Last Interaction:** No recorded interactions
- **Company Affiliation:** Not specified

**Key Topics and Interests:**
- No specific topics or interests have been identified from past interactions or notes. The tag "business" suggests a potential interest or relevance to professional or analytical contexts.

**Communication Patterns:**
- **Emails:** Primary mode of contact is email. No phone numbers are available.
- **Interactions:** There have been no recorded interactions, indicating a new or dormant relationship.
- **Persona Notes:** A note titled "A-Note a23f93" dated November 21, 2025, mentions "Context for Agent Analyze a23f935e" but lacks detail on specific interests or subjects.

**Important Context from Voice Notes:**
- There are no voice notes available in the current data set.

**Best Practices for Engaging with Agent Analyze a23f935e:**
1. **Initiate Contact via Email:** Since there are no phone numbers available, use
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true