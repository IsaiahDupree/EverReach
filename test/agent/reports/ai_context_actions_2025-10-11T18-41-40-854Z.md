# AI Context & Actions Smoke Test

- **Run ID**: c4d96364-2bee-4223-ba69-48ec60f697a7
- **Backend**: https://ever-reach-be.vercel.app
- **Contact**: 8037d854-7490-4446-91e7-687fbf588911 (AI Smoke c4d96364)

## Steps
- Create contact: 201 in 234ms
- Seed interaction: 200 in 179ms
- Agent compose smart: 200 in 2991ms
- Messages prepare: 201 in 432ms
- Warmth recompute: 200 in 289ms (warmth=34, band=n/a)
- Agent tools list: 200 in  57ms (count=9)
- Agent chat: 200 in 4385ms
- List interactions (latest): 200 in 114ms

## Chat
### Input
```json
{
  "message": "Give me a one-line context summary for this contact",
  "context": {
    "contact_id": "8037d854-7490-4446-91e7-687fbf588911",
    "use_tools": true
  }
}
```
### Output
```
The contact "AI Smoke c4d96364" is associated with the email ai-smoke+c4d963@example.com, and the most recent interaction was a note about an AI smoke seed on October 11, 2025.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 43aea8a9-014b-4767-9e1c-36f64b8bed79

## Assertions
- **Compose body present**: true
- **Warmth fields present**: false
- **Agent tools available**: true
- **Agent chat responded (200 or 500)**: true
- **Has at least one interaction**: true