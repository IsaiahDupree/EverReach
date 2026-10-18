# Agent Test: Contact Details

- **Contact**: 2470a323-55fd-4510-b7b0-e4250a1e167e (Test Contact dce5c9c1)

## Steps
- Create contact: 2470a323-55fd-4510-b7b0-e4250a1e167e
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "2470a323-55fd-4510-b7b0-e4250a1e167e",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact dce5c9c1, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: fe0bd93d-9e74-422c-8209-85cc55c8320e

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true