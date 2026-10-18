# Agent Test: Compose → Prepare → Send

- **Contact**: 49841aa8-722d-4397-82e2-6eba1fbeafe7 (Agent Compose 75d9d5aa)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "49841aa8-722d-4397-82e2-6eba1fbeafe7",
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
  "contact_id": "49841aa8-722d-4397-82e2-6eba1fbeafe7",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI am reaching out to explore opportunities for collaboration. Given our shared focus on innovative solutions, I believe there could be mutual benefits in discussing potential synergies. \n\nPlease let me know your availability for a brief call in the coming days to discuss this further.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I am reaching out to explore opportunities for collaboration. Given our shared focus on innovative solutions, I believe there could be mutual benefits in discussing potential synergies. 

Please let me know your availability for a brief call in the coming days to discuss this further.

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
  "request_id": "req_e6e28e60db02479daf7ab14d942abffc"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false