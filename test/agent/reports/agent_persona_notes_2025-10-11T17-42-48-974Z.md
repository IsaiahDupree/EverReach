# Agent Test: Persona Notes

- **Contact**: 87d52aa0-910c-477f-87b2-e75338505f5b (Agent PN 00792ae5)

## Steps
- Create contact: 87d52aa0-910c-477f-87b2-e75338505f5b
- Create persona note: 201
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch my persona notes for this contact and summarize them in one sentence. Do not ask for contact_id. Only return the summary.",
  "context": {
    "contact_id": "87d52aa0-910c-477f-87b2-e75338505f5b",
    "use_tools": true
  }
}
```
### Output
```
The contact is associated with various agents and business contexts, indicating a focus on professional relationships and collaboration.
```
- Tools used: get_persona_notes
- Conversation ID: b861431a-fc84-4874-9b87-9b70857a0af6

## Assertions
- **Used get_persona_notes tool**: true
- **Produced non-empty output**: true
- **PASS**: true