# Agent Test: Message Goals (via tools)

- **Contact**: ddee4ea9-5174-4f26-be10-f4158ac3de93 (Agent Goals 1e1fb54a)

## Steps
- Create contact: ddee4ea9-5174-4f26-be10-f4158ac3de93
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "ddee4ea9-5174-4f26-be10-f4158ac3de93",
    "use_tools": true
  }
}
```
### Output
```
The contact has one message goal in the 'business' category: **Agent Goals 1e1fb54a**. There are no suggested goals available.
```
- Tools used: get_message_goals
- Conversation ID: 766f84b9-614c-4c10-8701-e4f3d7dea36f

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true