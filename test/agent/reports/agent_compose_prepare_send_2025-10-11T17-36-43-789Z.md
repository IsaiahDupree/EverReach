# Agent Test: Compose → Prepare → Send

- **Contact**: 7b4370ed-8061-49dc-9353-0c27ee824913 (Agent Compose 89da8f0d)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "7b4370ed-8061-49dc-9353-0c27ee824913",
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
  "contact_id": "7b4370ed-8061-49dc-9353-0c27ee824913",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our mutual interests. Given our shared context from previous discussions, I believe there could be a beneficial partnership worth discussing.\n\nPlease let me know a convenient time for you to connect.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our mutual interests. Given our shared context from previous discussions, I believe there could be a beneficial partnership worth discussing.

Please let me know a convenient time for you to connect.

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