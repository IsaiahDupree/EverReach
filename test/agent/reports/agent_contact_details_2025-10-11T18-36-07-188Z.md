# Agent Test: Contact Details

- **Contact**: 560ed072-2a6c-4012-9060-8a6346fecbcb (Agent Details 6979acd1)

## Steps
- Create contact: 560ed072-2a6c-4012-9060-8a6346fecbcb
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "560ed072-2a6c-4012-9060-8a6346fecbcb",
    "use_tools": true
  }
}
```
### Output
```
Name: Agent Details 6979acd1, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 78deeddc-483a-4a1b-9430-d10080c81b95

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true