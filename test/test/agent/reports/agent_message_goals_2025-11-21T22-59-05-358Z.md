# Agent Test: Message Goals (via tools)

- **Contact**: 4040b9fb-18c9-4b8e-9de3-ff92608c29a9 (Agent Goals 9d7013b3)

## Steps
- Create contact: 4040b9fb-18c9-4b8e-9de3-ff92608c29a9
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "4040b9fb-18c9-4b8e-9de3-ff92608c29a9",
    "use_tools": true
  }
}
```
### Output
```
The only message goal for the category 'business' with this contact is "Agent Goals 9d7013b3." There are no suggested goals available.
```
- Tools used: get_message_goals
- Conversation ID: a19d0fed-3d4f-4ac1-b826-fec852b60c95

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true