# Agent Test: Interactions Summary

- **Contact**: c10d3fef-7dc8-491f-bb96-48a05870ccbe (Agent Inter 9041047b)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "c10d3fef-7dc8-491f-bb96-48a05870ccbe",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter 9041047b consisted of two notes: the first note recorded on November 21, 2025, at 22:31:05, and a second note shortly after, at 22:31:05, which indicates active communication.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 776cbc35-bb49-4196-85f0-bb84d2f50a22

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true