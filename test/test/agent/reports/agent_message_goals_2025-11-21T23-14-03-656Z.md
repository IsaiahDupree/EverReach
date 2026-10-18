# Agent Test: Message Goals (via tools)

- **Contact**: 22fda1ad-2a50-43f5-837e-4d595596da0a (Agent Goals 602f57f8)

## Steps
- Create contact: 22fda1ad-2a50-43f5-837e-4d595596da0a
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "22fda1ad-2a50-43f5-837e-4d595596da0a",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is:

- Agent Goals 602f57f8

There are no suggested goals available.
```
- Tools used: get_message_goals
- Conversation ID: 694ca53b-2795-46c1-8cce-ba6961d2e26e

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true