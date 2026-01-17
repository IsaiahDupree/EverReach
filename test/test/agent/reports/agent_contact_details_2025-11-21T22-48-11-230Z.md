# Agent Test: Contact Details

- **Contact**: 7469aba6-facd-4961-afdc-e0f277054934 (Test Contact 648f914d)

## Steps
- Create contact: 7469aba6-facd-4961-afdc-e0f277054934
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "7469aba6-facd-4961-afdc-e0f277054934",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact 648f914d, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 056c608f-0167-4bdd-93b7-19c6847f644c

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true