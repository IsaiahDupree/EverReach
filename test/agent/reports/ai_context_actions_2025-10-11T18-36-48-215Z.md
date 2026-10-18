# AI Context & Actions Smoke Test

- **Run ID**: 7a3719dd-6f04-438c-afbb-9e6d691d1b6a
- **Backend**: https://ever-reach-be.vercel.app
- **Contact**: 75a2092d-fa9e-436b-8918-d03ec07d9f8d (AI Smoke 7a3719dd)

## Steps
- Create contact: 201 in 234ms
- Seed interaction: 200 in 179ms
- Agent compose smart: 200 in 2204ms
- Messages prepare: 201 in 317ms
- Warmth recompute: 200 in 254ms (warmth=34, band=n/a)
- Agent tools list: 200 in  81ms (count=9)
- Agent chat: 200 in 6355ms
- List interactions (latest): 200 in 167ms

## Chat
### Input
```json
{
  "message": "Give me a one-line context summary for this contact",
  "context": {
    "contact_id": "75a2092d-fa9e-436b-8918-d03ec07d9f8d",
    "use_tools": true
  }
}
```
### Output
```
This contact, "AI Smoke 7a3719dd," is tagged as ai_smoke and has a recent note about an AI smoke seed recorded on October 11, 2025.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: ee6b468d-5bd8-42f4-b401-571feec50dd4

## Assertions
- **Compose body present**: true
- **Warmth fields present**: false
- **Agent tools available**: true
- **Agent chat responded (200 or 500)**: true
- **Has at least one interaction**: true