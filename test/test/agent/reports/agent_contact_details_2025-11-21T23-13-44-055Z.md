# Agent Test: Contact Details

- **Contact**: 19622966-a229-4652-9d70-00602defe8a8 (Test Contact 01650453)

## Steps
- Create contact: 19622966-a229-4652-9d70-00602defe8a8
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "19622966-a229-4652-9d70-00602defe8a8",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact 01650453, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: cfa51231-29a3-46f3-b2fd-a11b4479c2ec

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true