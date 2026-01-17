# Agent Test: Contact Details

- **Contact**: 0c8f640f-76e2-4978-914c-828fccb80aa7 (Test Contact 1c4a0b32)

## Steps
- Create contact: 0c8f640f-76e2-4978-914c-828fccb80aa7
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "0c8f640f-76e2-4978-914c-828fccb80aa7",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact 1c4a0b32, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 2eb016f3-e1b7-47ef-8417-1f6b24bfbb88

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true