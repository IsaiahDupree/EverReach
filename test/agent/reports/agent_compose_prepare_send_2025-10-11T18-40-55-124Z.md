# Agent Test: Compose → Prepare → Send

- **Contact**: 83fd0947-744a-4585-98cd-8c21882c54cc (Agent Compose 413423ff)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "83fd0947-744a-4585-98cd-8c21882c54cc",
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
  "contact_id": "83fd0947-744a-4585-98cd-8c21882c54cc",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to discuss potential collaboration opportunities that may align with our mutual interests. Given your expertise in this field, I believe there could be significant synergies to explore.\n\nCould we schedule a brief call to discuss this further? Please let me know your availability.\n\nLooking forward to your response.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to discuss potential collaboration opportunities that may align with our mutual interests. Given your expertise in this field, I believe there could be significant synergies to explore.

Could we schedule a brief call to discuss this further? Please let me know your availability.

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