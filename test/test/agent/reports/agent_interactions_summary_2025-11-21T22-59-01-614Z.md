# Agent Test: Interactions Summary

- **Contact**: e867d70c-809d-4a0f-ae9a-5d4b9a85c35b (Agent Inter 4a8d1054)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "e867d70c-809d-4a0f-ae9a-5d4b9a85c35b",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter involved taking notes at nearly the same time, with the first note noting a timestamp of "First note" and the second note capturing a timestamp of "Second note," both created on November 21, 2025.
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: c901a073-b0f3-47c4-8428-800193af716b

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true