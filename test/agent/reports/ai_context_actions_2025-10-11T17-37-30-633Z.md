# AI Context & Actions Smoke Test

- **Run ID**: 6fcb41e0-409f-4a7e-bb00-4418f3e482c0
- **Backend**: https://ever-reach-be.vercel.app
- **Contact**: 2fccf922-4ed1-4877-82d2-e4bcb6cf48fb (AI Smoke 6fcb41e0)

## Steps
- Create contact: 201 in 260ms
- Seed interaction: 200 in 212ms
- Agent compose smart: 200 in 2176ms
- Messages prepare: 201 in 332ms
- Warmth recompute: 200 in 354ms (warmth=34, band=n/a)
- Agent tools list: 200 in 181ms (count=9)
- Agent chat: 200 in 4139ms
- List interactions (latest): 200 in 124ms

## Chat
### Input
```json
{
  "message": "Give me a one-line context summary for this contact",
  "context": {
    "contact_id": "2fccf922-4ed1-4877-82d2-e4bcb6cf48fb",
    "use_tools": true
  }
}
```
### Output
```
The contact "AI Smoke 6fcb41e0" is associated with an email address and has a noted interaction regarding "AI smoke seed" on October 11, 2025.
```
- Tools used: get_contact, get_contact_interactions
- Conversation ID: 4a64b159-5a01-47e4-bfb8-249b38405238

## Assertions
- **Compose body present**: true
- **Warmth fields present**: false
- **Agent tools available**: true
- **Agent chat responded (200 or 500)**: true
- **Has at least one interaction**: true