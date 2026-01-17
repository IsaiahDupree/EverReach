# Agent Test: Persona Notes

- **Contact**: 6dfb6803-5165-498d-9085-0915829b704a (Agent PN 472cdeb4)

## Steps
- Create contact: 6dfb6803-5165-498d-9085-0915829b704a
- Create persona note: 201
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch my persona notes for this contact and summarize them in one sentence. Do not ask for contact_id. Only return the summary.",
  "context": {
    "contact_id": "6dfb6803-5165-498d-9085-0915829b704a",
    "use_tools": true
  }
}
```
### Output
```
The contact is associated with multiple persona notes related to various agents and business contexts.
```
- Tools used: get_persona_notes
- Conversation ID: 57f6c65f-aff0-41e5-8b9d-b6d65ff512d5

## Assertions
- **Used get_persona_notes tool**: true
- **Produced non-empty output**: true
- **PASS**: true