# AI Context & Actions Smoke Test

- **Run ID**: 66e8771c-06a5-4848-bb9a-8d30e9869681
- **Backend**: https://ever-reach-be.vercel.app
- **Contact**: 91307a69-fc48-4a8b-a308-f097198e4016 (AI Smoke 66e8771c)

## Steps
- Create contact: 201 in 877ms
- Seed interaction: 200 in 236ms
- Agent compose smart: 200 in 2843ms
- Messages prepare: 201 in 344ms
- Warmth recompute: 200 in 252ms (warmth=34, band=n/a)
- Agent tools list: 200 in  59ms (count=9)
- Agent chat: 200 in 4083ms
- List interactions (latest): 200 in 116ms

## Chat
### Input
```json
{
  "message": "Give me a one-line context summary for this contact",
  "context": {
    "contact_id": "91307a69-fc48-4a8b-a308-f097198e4016",
    "use_tools": true
  }
}
```
### Output
```
This contact, "AI Smoke 66e8771c," is tagged with "ai_smoke" and has a recent note about an AI smoke seed recorded on October 11, 2025.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: b9980fb3-ae6b-4a9e-bd2e-7b795e7af645

## Assertions
- **Compose body present**: true
- **Warmth fields present**: false
- **Agent tools available**: true
- **Agent chat responded (200 or 500)**: true
- **Has at least one interaction**: true