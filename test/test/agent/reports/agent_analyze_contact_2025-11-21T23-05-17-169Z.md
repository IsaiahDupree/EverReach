# Agent Test: Analyze Contact

- **Contact**: 1e8b56ea-35c7-427e-bae5-81eeed7e29b9 (Agent Analyze bd43b7ca)

## Input
```json
{
  "contact_id": "1e8b56ea-35c7-427e-bae5-81eeed7e29b9",
  "analysis_type": "context_summary",
  "include_voice_notes": true,
  "include_interactions": true
}
```

## Output (excerpt)
```
**Reference Guide for Agent Analyze bd43b7ca**

**Relationship Overview:**
- **Contact Name:** Agent Analyze bd43b7ca
- **Email:** agentanalyzebd43b7ca.agent-@example.com
- **Company Affiliation:** Not specified
- **Relationship Status:** Cold (No recent interactions or established rapport)

**Key Topics and Interests:**
- **Primary Focus:** Business-related topics, as indicated by the tags associated with the persona notes.
- **Potential Interest Areas:** Given the professional context and the agent's designation, discussions around analytics, data-driven strategies, or agent-based modeling might be relevant.

**Communication Patterns:**
- **Current Interaction Level:** No recorded interactions, suggesting initial outreach or re-engagement is necessary.
- **Preferred Communication Channels:** Email is the primary contact method available. No phone numbers or other communication channels are listed.

**Important Context from Voice Notes:**
- **Date of Note:** November 21, 2025
- **Content Summary:** The note titled "A-Note bd43b7" provides a timestamped context for Agent Analyze bd43b7ca, emphasizing a business focus. No specific details from voice notes are available, indicating a
```

## Assertions
- **Status 200**: true
- **Correct contact name**: true
- **Non-empty analysis**: true
- **Context counts**: interactions=0, persona_notes=1
- **PASS**: true