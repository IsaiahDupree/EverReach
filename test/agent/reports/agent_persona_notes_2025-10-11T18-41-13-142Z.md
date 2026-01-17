# Agent Test: Persona Notes

- **Contact**: 70fc7c06-3706-4ad2-942b-ad3dd61edb51 (Agent PN 6e228c49)

## Steps
- Create contact: 70fc7c06-3706-4ad2-942b-ad3dd61edb51
- Create persona note: 201
- Agent chat: 200

## Chat
### Input
```json
{
  "message": "Using tools, fetch my persona notes for this contact and summarize them in one sentence. Do not ask for contact_id. Only return the summary.",
  "context": {
    "contact_id": "70fc7c06-3706-4ad2-942b-ad3dd61edb51",
    "use_tools": true
  }
}
```
### Output
```
The persona notes for this contact include various contexts and insights related to business interactions with agents.
```
- Tools used: get_persona_notes
- Conversation ID: 33379cea-6514-4310-89d4-bc9a8877fb2d

## Assertions
- **Used get_persona_notes tool**: true
- **Produced non-empty output**: true
- **PASS**: true