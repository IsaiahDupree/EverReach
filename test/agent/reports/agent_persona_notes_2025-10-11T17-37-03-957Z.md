# Agent Test: Persona Notes

- **Contact**: 1eb96ced-30d9-4293-ba36-c46ea5bb6f25 (Agent PN fa317852)

## Steps
- Create contact: 1eb96ced-30d9-4293-ba36-c46ea5bb6f25
- Create persona note: 201
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch my persona notes for this contact and summarize them in one sentence. Do not ask for contact_id. Only return the summary.",
  "context": {
    "contact_id": "1eb96ced-30d9-4293-ba36-c46ea5bb6f25",
    "use_tools": true
  }
}
```
### Output
```
The persona notes for this contact include various contexts and details related to their business interactions with agents, highlighting their roles and references to specific agent identifiers.
```
- Tools used: get_persona_notes
- Conversation ID: f476afe6-6e1d-4065-ab9a-6789ce2e4dd1

## Assertions
- **Used get_persona_notes tool**: true
- **Produced non-empty output**: true
- **PASS**: true