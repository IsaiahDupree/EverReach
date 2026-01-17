# Agent Test: Interactions Summary

- **Contact**: 10203fca-f259-4d1f-a92b-1b1a7722458c (Agent Inter ee88eef3)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "10203fca-f259-4d1f-a92b-1b1a7722458c",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter ee88eef3 involved the creation of two notes, with the first note noted on October 11, 2025, and the second note shortly after on the same day.
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: d885188c-adcf-41e0-b664-2c19e9e2b8cb

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true