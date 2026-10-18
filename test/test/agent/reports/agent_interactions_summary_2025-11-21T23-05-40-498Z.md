# Agent Test: Interactions Summary

- **Contact**: 3ce8aba7-8365-4fa4-9a48-72b13f044612 (Agent Inter 08f6347f)

## Steps
- Seed interactions: 200, 200
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, summarize the last 2 interactions for this contact in one sentence.",
  "context": {
    "contact_id": "3ce8aba7-8365-4fa4-9a48-72b13f044612",
    "use_tools": true
  }
}
```
### Output
```
The last two interactions with Agent Inter 08f6347f were notes recorded on November 21, 2025: the first note was created at 23:05:35, followed by a second note shortly after at 23:05:36.
```
- Tools used: get_contact_interactions, get_contact
- Conversation ID: 5f5cbd7f-4f45-4559-977f-86be4919a4ed

## Assertions
- **Used get_contact_interactions tool**: true
- **Produced non-empty output**: true
- **PASS**: true