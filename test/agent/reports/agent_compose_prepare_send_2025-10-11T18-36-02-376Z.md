# Agent Test: Compose → Prepare → Send

- **Contact**: f0e06ad2-2780-4d95-aa84-ae14cc265eee (Agent Compose 16e44d24)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "f0e06ad2-2780-4d95-aa84-ae14cc265eee",
  "goal_type": "business",
  "channel": "email",
  "tone": "concise",
  "include_voice_context": true,
  "include_interaction_history": true
}
```
### Prepare payload
```json
{
  "contact_id": "f0e06ad2-2780-4d95-aa84-ae14cc265eee",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I'm reaching out to explore potential collaboration opportunities. Given our shared interests in the industry, I believe we could benefit from discussing how our goals align.\n\nCould we schedule a brief call next week to connect? Please let me know your availability.\n\nLooking forward to your response.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
  },
  "composer_context": {
    "template_id": null
  }
}
```

## Outputs
### Compose response snippet
```
Dear Agent Compose,

I hope this message finds you well. I'm reaching out to explore potential collaboration opportunities. Given our shared interests in the industry, I believe we could benefit from discussing how our goals align.

Could we schedule a brief call next week to connect? Please let me know your availability.

Looking forward to your response.

Best regards,  
[Your Name]  
[Your Position]  
[Your Company]  
[Your Contact Information]
```
### Send response
```json
{
  "error": "Could not find the 'delivery_status' column of 'messages' in the schema cache"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false