# Agent Test: Compose → Prepare → Send

- **Contact**: 3a1ff696-8cfa-49e9-a8de-daf7c61b8a12 (Agent Compose c47d96a5)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "3a1ff696-8cfa-49e9-a8de-daf7c61b8a12",
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
  "contact_id": "3a1ff696-8cfa-49e9-a8de-daf7c61b8a12",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities between our teams. Given our shared focus on innovative solutions, I believe there could be mutual benefits in discussing how we might work together.\n\nPlease let me know a suitable time for a brief call to discuss this further.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities between our teams. Given our shared focus on innovative solutions, I believe there could be mutual benefits in discussing how we might work together.

Please let me know a suitable time for a brief call to discuss this further.

Best regards,  
[Your Name]  
[Your Position]  
[Your Company]  
[Your Contact Information]
```
### Send response
```json
{
  "error": "Could not find the 'delivery_status' column of 'messages' in the schema cache",
  "request_id": "req_d46e118249674653bb818be781edeeb0"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false