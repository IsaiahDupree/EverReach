# Agent Test: Interactions Summary

- **Contact**: ca6b8414-d86a-4dd8-b654-df8f4523356d (Agent Inter b75b3489)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "ca6b8414-d86a-4dd8-b654-df8f4523356d",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter b75b3489 included two notes, the first noting "First note" and the second "Second note," both created on November 21, 2025.
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: b057733d-8c9d-4e1d-ba5f-6e27779f7862

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true