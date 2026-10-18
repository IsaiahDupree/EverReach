# Agent Test: Message Goals (via tools)

- **Contact**: a3caa20c-aaac-4079-a48c-ced4a0c10e64 (Agent Goals bc484c9d)

## Steps
- Create contact: a3caa20c-aaac-4079-a48c-ced4a0c10e64
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "a3caa20c-aaac-4079-a48c-ced4a0c10e64",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is: **Agent Goals bc484c9d**. There are no suggested goals listed.
```
- Tools used: get_message_goals
- Conversation ID: a69e05bd-4c73-4de8-98fa-c3fb1b661def

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true