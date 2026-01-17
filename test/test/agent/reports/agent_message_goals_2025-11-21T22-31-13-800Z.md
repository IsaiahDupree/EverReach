# Agent Test: Message Goals (via tools)

- **Contact**: 2101716e-ce59-4ea3-bf03-d354acac86b6 (Agent Goals a4c14ce2)

## Steps
- Create contact: 2101716e-ce59-4ea3-bf03-d354acac86b6
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "2101716e-ce59-4ea3-bf03-d354acac86b6",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is: **Agent Goals a4c14ce2**. There are no suggested goals listed.
```
- Tools used: get_message_goals
- Conversation ID: acf79398-e903-4b21-b3d0-992bce185564

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true