# Agent Test: Interactions Summary

- **Contact**: 6e23df7e-aae2-4240-95ab-8161920f52fb (Agent Inter 21933825)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "6e23df7e-aae2-4240-95ab-8161920f52fb",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter 21933825 consisted of two notes: the first note was created on November 21, 2025, stating "First note," and the second note, also on the same date, stating "Second note."
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 99219592-28af-48e9-ade4-9d4547720e52

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true