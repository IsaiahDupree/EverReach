# Agent Test: Compose → Prepare → Send

- **Contact**: 6eda11dd-5165-44e1-b1db-168d549a268d (Agent Compose 371ad372)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "6eda11dd-5165-44e1-b1db-168d549a268d",
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
  "contact_id": "6eda11dd-5165-44e1-b1db-168d549a268d",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose 371ad372,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities. We are currently seeking partnerships that align with our objectives and would like to discuss how we might work together. \n\nPlease let me know if you are available for a brief call or meeting to discuss this further.\n\nLooking forward to your response.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
  },
  "composer_context": {
    "template_id": null
  }
}
```

## Outputs
### Compose response snippet
```
Dear Agent Compose 371ad372,

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities. We are currently seeking partnerships that align with our objectives and would like to discuss how we might work together. 

Please let me know if you are available for a brief call or meeting to discuss this further.

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
  "request_id": "req_f6af554a35de4853ac5245c7886a02e1"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false