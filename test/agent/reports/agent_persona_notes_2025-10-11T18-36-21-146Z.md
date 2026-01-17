# Agent Test: Persona Notes

- **Contact**: 617d03ce-2d28-4f9a-b068-e2bfbfc46e4a (Agent PN dd1c2819)

## Steps
- Create contact: 617d03ce-2d28-4f9a-b068-e2bfbfc46e4a
- Create persona note: 201
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch my persona notes for this contact and summarize them in one sentence. Do not ask for contact_id. Only return the summary.",
  "context": {
    "contact_id": "617d03ce-2d28-4f9a-b068-e2bfbfc46e4a",
    "use_tools": true
  }
}
```
### Output
```
The contact is associated with multiple persona notes related to business, indicating a focus on various agent analyses and contexts for operations.
```
- Tools used: get_persona_notes
- Conversation ID: c16ea60a-100c-41c8-9e77-dfc5b92e14e1

## Assertions
- **Used get_persona_notes tool**: true
- **Produced non-empty output**: true
- **PASS**: true