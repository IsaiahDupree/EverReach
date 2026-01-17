# Agent Test: Interactions Summary

- **Contact**: 2d222e4a-36ac-443d-b4d7-f248a4afb05b (Agent Inter 808ffb0d)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "2d222e4a-36ac-443d-b4d7-f248a4afb05b",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter 808ffb0d involved taking notes on November 21, 2025, with the first note stating "First note" and the second note adding "Second note."
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: d6d02754-830e-4eb5-be9d-203ecc1dbc46

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true