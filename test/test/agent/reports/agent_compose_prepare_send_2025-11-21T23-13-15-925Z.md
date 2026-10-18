# Agent Test: Compose → Prepare → Send

- **Contact**: 933dbe9a-bd0f-447e-bd4b-23f2ec2f3d39 (Agent Compose 9b8fc10c)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "933dbe9a-bd0f-447e-bd4b-23f2ec2f3d39",
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
  "contact_id": "933dbe9a-bd0f-447e-bd4b-23f2ec2f3d39",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our recent discussions on market trends and client needs. \n\nPlease let me know if you are available for a brief call next week to discuss this further.\n\nLooking forward to your response.\n\nBest,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our recent discussions on market trends and client needs. 

Please let me know if you are available for a brief call next week to discuss this further.

Looking forward to your response.

Best,  
[Your Name]  
[Your Position]  
[Your Company]  
[Your Contact Information]
```
### Send response
```json
{
  "error": "Could not find the 'delivery_status' column of 'messages' in the schema cache",
  "request_id": "req_fa17194bb90e4484b8235354f769bbcf"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false