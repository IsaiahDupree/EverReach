# Agent Test: Contact Details

- **Contact**: bc8a5089-84a8-4759-8174-c3d1f33c2cf5 (Agent Details 29e51c31)

## Steps
- Create contact: bc8a5089-84a8-4759-8174-c3d1f33c2cf5
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "bc8a5089-84a8-4759-8174-c3d1f33c2cf5",
    "use_tools": true
  }
}
```
### Output
```
Name: Agent Details 29e51c31, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: de8ea1e2-897f-4416-8b6f-fe3d666e9a84

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true