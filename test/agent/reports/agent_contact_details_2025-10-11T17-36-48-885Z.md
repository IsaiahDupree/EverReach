# Agent Test: Contact Details

- **Contact**: 95fe69d4-0f35-4b86-b36f-2b1c4a54cab5 (Agent Details 4889c572)

## Steps
- Create contact: 95fe69d4-0f35-4b86-b36f-2b1c4a54cab5
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "95fe69d4-0f35-4b86-b36f-2b1c4a54cab5",
    "use_tools": true
  }
}
```
### Output
```
Name: Agent Details 4889c572, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: f9e93f90-0906-4203-bd67-959e8fee7dc5

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true