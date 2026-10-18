# Agent Test: Contact Details

- **Contact**: 934f522f-2167-432d-bcb1-4620a9925c7f (Test Contact ae839b9b)

## Steps
- Create contact: 934f522f-2167-432d-bcb1-4620a9925c7f
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score> If warmth is not available, use N/A.",
  "context": {
    "contact_id": "934f522f-2167-432d-bcb1-4620a9925c7f",
    "use_tools": true
  }
}
```
### Output
```
Name: Test Contact ae839b9b, Warmth: 0
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 4323e9df-fa1c-4076-9f4f-cc500426bb54

## Assertions
- **Used get_contact tool**: true
- **Mentions contact name**: true
- **PASS**: true