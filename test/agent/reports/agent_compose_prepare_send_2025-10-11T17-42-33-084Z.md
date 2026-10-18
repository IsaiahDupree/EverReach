# Agent Test: Compose → Prepare → Send

- **Contact**: 86f345a5-542a-4be4-af34-3f4b8a6395a6 (Agent Compose 99cb376b)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "86f345a5-542a-4be4-af34-3f4b8a6395a6",
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
  "contact_id": "86f345a5-542a-4be4-af34-3f4b8a6395a6",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities that could be mutually beneficial. Given your expertise, I believe there may be synergies we could leverage.\n\nCould we schedule a brief call to discuss this further? Please let me know your availability.\n\nLooking forward to your response.\n\nBest regards,  \n[Your Name]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities that could be mutually beneficial. Given your expertise, I believe there may be synergies we could leverage.

Could we schedule a brief call to discuss this further? Please let me know your availability.

Looking forward to your response.

Best regards,  
[Your Name]  
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