# AI Context & Actions Smoke Test

- **Run ID**: 10d93c8a-2f91-4671-bbdd-f67dffe1f35e
- **Backend**: https://ever-reach-be.vercel.app
- **Contact**: c1957663-d1d8-4153-b2d8-9f8f6701d82c (AI Smoke 10d93c8a)

## Steps
- Create contact: 201 in 272ms
- Seed interaction: 200 in 245ms
- Agent compose smart: 200 in 2102ms
- Messages prepare: 201 in 312ms
- Warmth recompute: 200 in 266ms (warmth=34, band=n/a)
- Agent tools list: 200 in  71ms (count=9)
- Agent chat: 200 in 5169ms
- List interactions (latest): 200 in 130ms

## Chat
### Input
```json
{
  "message": "Give me a one-line context summary for this contact",
  "context": {
    "contact_id": "c1957663-d1d8-4153-b2d8-9f8f6701d82c",
    "use_tools": true
  }
}
```
### Output
```
The contact "AI Smoke 10d93c8a" has a note indicating the presence of an "AI smoke seed" recorded on October 11, 2025.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: f97de801-ea5a-497f-b8c8-8e5c4d0eb853

## Assertions
- **Compose body present**: true
- **Warmth fields present**: false
- **Agent tools available**: true
- **Agent chat responded (200 or 500)**: true
- **Has at least one interaction**: true