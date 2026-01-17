# Agent Test: Contact Details

- **Contact**: de2f7e4e-a9ee-4fe2-997b-0b065370350a (Test Contact 9b0888f9)

## Steps
- Create contact: de2f7e4e-a9ee-4fe2-997b-0b065370350a
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "de2f7e4e-a9ee-4fe2-997b-0b065370350a",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact 9b0888f9, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 9fa52979-df00-4bbf-be7d-e79368414dac

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true