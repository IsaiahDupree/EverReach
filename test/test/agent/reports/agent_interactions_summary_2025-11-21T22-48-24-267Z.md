# Agent Test: Interactions Summary

- **Contact**: 5909d4ae-c6d1-4529-ac7b-b99d8cd8e7cd (Agent Inter d2591a44)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "5909d4ae-c6d1-4529-ac7b-b99d8cd8e7cd",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter d2591a44 were notes created on November 21, 2025, with the content "First note" and "Second note."
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: 4155f345-1e9d-47f8-9a67-c574d9b6a4d4

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true