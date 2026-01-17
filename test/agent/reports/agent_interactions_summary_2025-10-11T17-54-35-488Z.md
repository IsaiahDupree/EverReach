# Agent Test: Interactions Summary

- **Contact**: a8adfe9c-9fa0-4419-a55f-bfe14e7aa2b3 (Agent Inter 873c5500)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "a8adfe9c-9fa0-4419-a55f-bfe14e7aa2b3",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter 873c5500 were two notes created on October 11, 2025: the first note marked "First note" and the second note marked "Second note."
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: 4fdc6fec-4d17-4e4a-acbd-72da6897840d

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true