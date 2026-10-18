# Agent Test: Interactions Summary

- **Contact**: 6e30d962-011e-4941-848f-3d056ea43813 (Agent Inter 66f509bb)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "6e30d962-011e-4941-848f-3d056ea43813",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with this contact were notes recorded on November 21, 2025, with the first noting a brief update and the second following shortly after with additional details.
```
- Tools used: get_contact_interactions
- Conversation ID: 8adc1c4d-29ab-48c7-bdb8-7ed759640fd7

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true