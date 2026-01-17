# Agent Test: Contact Details

- **Contact**: 8d74e24d-7746-49d7-8143-02c550f984a8 (Agent Details 3186f426)

## Steps
- Create contact: 8d74e24d-7746-49d7-8143-02c550f984a8
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "8d74e24d-7746-49d7-8143-02c550f984a8",
    "use_tools": true
  }
}
```
### Output
```
Name: Agent Details 3186f426, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: cb94fcd5-ce54-4f8b-96f4-151d5a119426

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true