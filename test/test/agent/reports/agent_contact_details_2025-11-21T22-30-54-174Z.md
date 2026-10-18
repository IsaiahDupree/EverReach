# Agent Test: Contact Details

- **Contact**: bee0b38e-5c47-48a5-b31a-f6c03b061008 (Test Contact b30ed7a9)

## Steps
- Create contact: bee0b38e-5c47-48a5-b31a-f6c03b061008
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "bee0b38e-5c47-48a5-b31a-f6c03b061008",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact b30ed7a9, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 0a6b040b-cee1-49c3-8c5e-517def9c16ed

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true