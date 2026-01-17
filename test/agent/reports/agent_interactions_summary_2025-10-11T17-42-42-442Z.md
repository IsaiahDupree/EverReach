# Agent Test: Interactions Summary

- **Contact**: 170a2556-b10c-44c5-899d-d0fd2dfd4d23 (Agent Inter 5e148e34)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "170a2556-b10c-44c5-899d-d0fd2dfd4d23",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter 5e148e34 were both notes taken on October 11, 2025, with the first note being recorded at 17:42:37 and the second shortly after at 17:42:38.
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: c1a7c281-f9cc-4f34-9c72-bba140994f21

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true