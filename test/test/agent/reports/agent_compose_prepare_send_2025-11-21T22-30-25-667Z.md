# Agent Test: Compose → Prepare → Send

- **Contact**: c58faf5e-dffa-4224-9663-b2aa78a38d0a (Agent Compose beccdfd9)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "c58faf5e-dffa-4224-9663-b2aa78a38d0a",
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
  "contact_id": "c58faf5e-dffa-4224-9663-b2aa78a38d0a",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities. Given your expertise in the field, I believe there could be mutual benefits in discussing our respective services.\n\nPlease let me know a convenient time for you to connect or if you prefer to communicate via email.\n\nLooking forward to your response.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities. Given your expertise in the field, I believe there could be mutual benefits in discussing our respective services.

Please let me know a convenient time for you to connect or if you prefer to communicate via email.

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
  "error": "Could not find the 'delivery_status' column of 'messages' in the schema cache",
  "request_id": "req_9e566b3a249c4693b7cfb58d76505bb2"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false