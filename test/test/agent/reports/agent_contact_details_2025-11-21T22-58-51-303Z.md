# Agent Test: Contact Details

- **Contact**: 7665ab32-e890-4788-a68e-43b3a5cba7dd (Test Contact b98ace6a)

## Steps
- Create contact: 7665ab32-e890-4788-a68e-43b3a5cba7dd
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "7665ab32-e890-4788-a68e-43b3a5cba7dd",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact b98ace6a, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 81ec578f-04bb-4d3d-ae0b-e13b7aef2d12

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true