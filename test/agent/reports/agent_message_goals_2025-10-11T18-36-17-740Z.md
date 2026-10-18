# Agent Test: Message Goals (via tools)

- **Contact**: 2f0d5e2f-e146-44ee-a99e-c850fb7c145d (Agent Goals 370e0bbc)

## Steps
- Create contact: 2f0d5e2f-e146-44ee-a99e-c850fb7c145d
- Agent chat (get_message_goals): 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch message goals for category 'business' for this contact and list their names only.",
  "context": {
    "contact_id": "2f0d5e2f-e146-44ee-a99e-c850fb7c145d",
    "use_tools": true
  }
}
```
### Output
```
The message goal for the category 'business' for this contact is: 

- Agent Goals 370e0bbc 

There are no suggested goals available.
```
- Tools used: get_message_goals
- Conversation ID: 3f17d5d1-d9e2-4b18-aaba-244ea7762696

## Assertions
- **Used get_message_goals tool**: true
- **Produced non-empty output**: true
- **PASS**: true