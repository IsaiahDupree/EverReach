# Agent Test: Message Goals (via tools)

- **Contact**: 265f2937-cb13-41b9-bf70-2c05c5b432da (Agent Goals eea5107b)

## Steps
- Create contact: 265f2937-cb13-41b9-bf70-2c05c5b432da
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "265f2937-cb13-41b9-bf70-2c05c5b432da",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is: **Agent Goals eea5107b**. There are no suggested goals listed.
```
- Tools used: get_message_goals
- Conversation ID: 707d98b2-5c50-4033-80cc-358723aa8974

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true