# Agent Test: Message Goals (via tools)

- **Contact**: 783c69b6-8003-4b80-aaaa-dbf2f5c56935 (Agent Goals a40fa54c)

## Steps
- Create contact: 783c69b6-8003-4b80-aaaa-dbf2f5c56935
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "783c69b6-8003-4b80-aaaa-dbf2f5c56935",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is:

- Agent Goals a40fa54c

There are no suggested goals listed. If you need further assistance or details, let me know!
```
- Tools used: get_message_goals
- Conversation ID: 53090c04-fa98-46c6-9e85-a867f16ff51e

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true