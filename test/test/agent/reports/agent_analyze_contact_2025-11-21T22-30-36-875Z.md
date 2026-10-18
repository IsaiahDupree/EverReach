# Agent Test: Analyze Contact

- **Contact**: 4c130aaa-7bda-4f10-8426-009f1cc05665 (Agent Analyze 4756abd4)

## Input
```json
{
  "contact_id": "4c130aaa-7bda-4f10-8426-009f1cc05665",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Agent Analyze 4756abd4 Relationship Reference Guide**

**Relationship Overview:**
- **Name:** Agent Analyze 4756abd4
- **Email:** agentanalyze4756abd4.agent-@example.com
- **Company:** Not specified
- **Tags:** Agent Test
- **Warmth Level:** Cold (0 warmth score)
- **Last Interaction:** None recorded
- **Notes:** None available

**Key Topics and Interests:**
- The only available note is tagged with "business," indicating a possible interest or focus area in business-related topics.

**Communication Patterns:**
- **Emails:** Primary mode of contact is via email.
- **Phones:** No phone number available, suggesting email is the preferred or only method of communication.
- **Interactions:** No recorded interactions, indicating a new or dormant relationship.

**Important Context from Voice Notes:**
- **Note Title:** A-Note 4756ab
- **Content:** Contains context for Agent Analyze 4756abd4, dated November 21, 2025.
- **Tags:** Includes "Agent Analyze 4756abd4" and "business," reinforcing the business context.

**Best Practices for Engaging with Agent Analyze 4756abd4:**
1. **Initiate Contact via Email:** Since there are no phone details, email is the best channel for initiating communic
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true