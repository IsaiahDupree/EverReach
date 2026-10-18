# Agent Test: Contact Details

- **Contact**: f627b1f1-684f-40f0-b454-664142ed2a87 (Test Contact d21d5963)

## Steps
- Create contact: f627b1f1-684f-40f0-b454-664142ed2a87
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "f627b1f1-684f-40f0-b454-664142ed2a87",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact d21d5963, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: c0340a75-51ee-4d50-833d-bf8595cd7bba

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true