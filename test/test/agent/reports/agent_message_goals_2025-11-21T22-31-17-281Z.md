# Agent Test: Message Goals (via tools)

- **Contact**: d51109ea-c80b-4803-bd39-9dc8dc846552 (Agent Goals 2dc9fd84)

## Steps
- Create contact: d51109ea-c80b-4803-bd39-9dc8dc846552
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "d51109ea-c80b-4803-bd39-9dc8dc846552",
    "use_tools": true
  }
}
```
### Output
```
For the contact, the message goal in the 'business' category is: 

- Agent Goals 2dc9fd84

There are no suggested goals available at this time.
```
- Tools used: get_message_goals
- Conversation ID: 460b41a6-be1d-4486-a3e1-0a0bdb36b017

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true