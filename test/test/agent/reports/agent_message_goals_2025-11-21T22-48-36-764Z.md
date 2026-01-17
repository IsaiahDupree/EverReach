# Agent Test: Message Goals (via tools)

- **Contact**: 12b550f6-cce0-4dc5-a1a3-82d504ba121f (Agent Goals 9d5ac7b3)

## Steps
- Create contact: 12b550f6-cce0-4dc5-a1a3-82d504ba121f
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "12b550f6-cce0-4dc5-a1a3-82d504ba121f",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is:

- Agent Goals 9d5ac7b3

There are no suggested goals in this category.
```
- Tools used: get_message_goals
- Conversation ID: b81ca01a-5571-47dc-9795-bac062921260

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true