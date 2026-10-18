# Agent Test: Message Goals (via tools)

- **Contact**: 6113eccc-1301-4ec7-83a5-8426ded0df7d (Agent Goals 1cf54bf5)

## Steps
- Create contact: 6113eccc-1301-4ec7-83a5-8426ded0df7d
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "6113eccc-1301-4ec7-83a5-8426ded0df7d",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is: **Agent Goals 1cf54bf5**. There are no suggested goals available.
```
- Tools used: get_message_goals
- Conversation ID: 30c36eec-95da-4416-8e6f-886ffa32894d

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true