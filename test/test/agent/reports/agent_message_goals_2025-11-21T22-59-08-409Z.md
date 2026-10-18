# Agent Test: Message Goals (via tools)

- **Contact**: dddd0e10-1a78-4bb6-9521-004833ef41ed (Agent Goals 0fd12fe1)

## Steps
- Create contact: dddd0e10-1a78-4bb6-9521-004833ef41ed
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "dddd0e10-1a78-4bb6-9521-004833ef41ed",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is:

- Agent Goals 0fd12fe1

There are no suggested goals available. Let me know if you need further assistance!
```
- Tools used: get_message_goals
- Conversation ID: fdbd37e9-a21d-4768-8e77-9c6a9d270290

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true