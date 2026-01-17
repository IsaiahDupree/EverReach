# Agent Test: Compose → Prepare → Send

- **Contact**: a47d0526-dd6c-4eb3-95e0-14e339219bd2 (Agent Compose 18fdae09)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "a47d0526-dd6c-4eb3-95e0-14e339219bd2",
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
  "contact_id": "a47d0526-dd6c-4eb3-95e0-14e339219bd2",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear [Agent's Name],\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our mutual interests. \n\nIf this is of interest, I would appreciate the chance to discuss how we can work together. Please let me know your availability for a brief call.\n\nLooking forward to your response.\n\nBest,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
  },
  "composer_context": {
    "template_id": null
  }
}
```

## Outputs
### Compose response snippet
```
Dear [Agent's Name],

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities that align with our mutual interests. 

If this is of interest, I would appreciate the chance to discuss how we can work together. Please let me know your availability for a brief call.

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
  "error": "Could not find the 'delivery_status' column of 'messages' in the schema cache"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false