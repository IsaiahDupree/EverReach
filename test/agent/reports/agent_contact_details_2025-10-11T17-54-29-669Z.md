# Agent Test: Contact Details

- **Contact**: 20ab0036-17c4-44b1-9698-07126dc67de9 (Agent Details a6bff4da)

## Steps
- Create contact: 20ab0036-17c4-44b1-9698-07126dc67de9
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "20ab0036-17c4-44b1-9698-07126dc67de9",
    "use_tools": true
  }
}
```
### Output
```
Name: Agent Details a6bff4da, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 71eac3a7-63cb-4e0b-bf26-491249ddfb78

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true