# Agent Test: Compose → Prepare → Send

- **Contact**: 3474d4c7-5d2e-4f11-b362-db7d4cfc801d (Agent Compose b9e903f9)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "3474d4c7-5d2e-4f11-b362-db7d4cfc801d",
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
  "contact_id": "3474d4c7-5d2e-4f11-b362-db7d4cfc801d",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities. Given your expertise in the industry, I believe there could be mutual benefits to discuss.\n\nPlease let me know a convenient time for you to connect or if you prefer to exchange ideas via email.\n\nLooking forward to your response.\n\nBest,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
  },
  "composer_context": {
    "template_id": null
  }
}
```

## Outputs
### Compose response snippet
```
Dear Agent,

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities. Given your expertise in the industry, I believe there could be mutual benefits to discuss.

Please let me know a convenient time for you to connect or if you prefer to exchange ideas via email.

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
  "request_id": "req_c35d6ac11eae4b668df229fbae3e8c49"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false