# Agent Test: Interactions Summary

- **Contact**: 77f94ebf-8227-413c-bacc-43422282b11a (Agent Inter 15c02f13)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "77f94ebf-8227-413c-bacc-43422282b11a",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter 15c02f13 involved the addition of two notes: the first note was created at 18:36:07 on October 11, 2025, and the second note was added shortly after at 18:36:08 on the same day.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 8a8fecbe-fe74-47be-9d6e-e376858d613f

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true