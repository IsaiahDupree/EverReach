# Agent Test: Compose → Prepare → Send

- **Contact**: 17a9506a-ce7c-4f24-a1d3-f679d62088aa (Agent Compose 0a37309e)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "17a9506a-ce7c-4f24-a1d3-f679d62088aa",
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
  "contact_id": "17a9506a-ce7c-4f24-a1d3-f679d62088aa",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our mutual interests in the industry. \n\nIf you’re open to a discussion, please let me know your availability for a brief call next week. \n\nThank you for considering this.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our mutual interests in the industry. 

If you’re open to a discussion, please let me know your availability for a brief call next week. 

Thank you for considering this.

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
  "request_id": "req_235b2a972a9b4424b9f6db74d6e4c50d"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false