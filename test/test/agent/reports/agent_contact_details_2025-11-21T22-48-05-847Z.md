# Agent Test: Contact Details

- **Contact**: 99aeda29-dfb6-4411-8cef-686958d54298 (Test Contact 9eaac4fd)

## Steps
- Create contact: 99aeda29-dfb6-4411-8cef-686958d54298
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "99aeda29-dfb6-4411-8cef-686958d54298",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact 9eaac4fd, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: c3ee46ab-503e-4b8d-8d9a-86e34985f2ce

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true