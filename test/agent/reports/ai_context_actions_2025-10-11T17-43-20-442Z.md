# AI Context & Actions Smoke Test

- **Run ID**: d9a7de20-0671-4619-a64a-1288fbeb09d4
- **Backend**: https://ever-reach-be.vercel.app
- **Contact**: 8533fcc4-f32c-4513-8295-849b2b0b40da (AI Smoke d9a7de20)

## Steps
- Create contact: 201 in 237ms
- Seed interaction: 200 in 182ms
- Agent compose smart: 200 in 2798ms
- Messages prepare: 201 in 361ms
- Warmth recompute: 200 in 224ms (warmth=34, band=n/a)
- Agent tools list: 200 in  66ms (count=9)
- Agent chat: 200 in 3557ms
- List interactions (latest): 200 in 110ms

## Chat
### Input
```json
{
  "message": "Give me a one-line context summary for this contact",
  "context": {
    "contact_id": "8533fcc4-f32c-4513-8295-849b2b0b40da",
    "use_tools": true
  }
}
```
### Output
```
The contact "AI Smoke d9a7de20" has a note regarding an AI smoke seed recorded on October 11, 2025.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 669d5b72-e846-4de7-a945-0aa038e67ec1

## Assertions
- **Compose body present**: true
- **Warmth fields present**: false
- **Agent tools available**: true
- **Agent chat responded (200 or 500)**: true
- **Has at least one interaction**: true