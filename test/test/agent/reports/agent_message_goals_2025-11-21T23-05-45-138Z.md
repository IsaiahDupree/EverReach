# Agent Test: Message Goals (via tools)

- **Contact**: 52425569-0ea3-45cf-88d0-23d630dbb73f (Agent Goals c31fd16b)

## Steps
- Create contact: 52425569-0ea3-45cf-88d0-23d630dbb73f
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "52425569-0ea3-45cf-88d0-23d630dbb73f",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is:

- Agent Goals c31fd16b

There are no suggested goals listed. If you need further assistance or details, feel free to ask!
```
- Tools used: get_message_goals
- Conversation ID: 9f0f376c-bb20-4162-bfab-d9f97eb13a11

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true