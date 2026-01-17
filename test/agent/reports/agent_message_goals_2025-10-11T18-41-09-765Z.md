# Agent Test: Message Goals (via tools)

- **Contact**: cd11b5f0-09be-4e74-88d0-8f7f7a08b7c8 (Agent Goals f35289ad)

## Steps
- Create contact: cd11b5f0-09be-4e74-88d0-8f7f7a08b7c8
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "cd11b5f0-09be-4e74-88d0-8f7f7a08b7c8",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is "Agent Goals f35289ad." There are no suggested goals listed.
```
- Tools used: get_message_goals
- Conversation ID: 9a09a0d0-91b4-42b1-92c9-7c9ddd7432fc

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true