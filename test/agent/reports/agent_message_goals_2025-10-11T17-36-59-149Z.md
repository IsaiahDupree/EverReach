# Agent Test: Message Goals (via tools)

- **Contact**: 1ee1fd5e-66ad-41a6-9426-153ace681d44 (Agent Goals 160d566e)

## Steps
- Create contact: 1ee1fd5e-66ad-41a6-9426-153ace681d44
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "1ee1fd5e-66ad-41a6-9426-153ace681d44",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is:

- Agent Goals 160d566e

There are no suggested goals listed. Would you like to add any specific goals or take further action?
```
- Tools used: get_message_goals
- Conversation ID: 8172fd79-6cf6-4278-bd07-53dd3cc2eea0

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true