# Agent Test: Compose → Prepare → Send

- **Contact**: ed03126c-7215-4f9c-bf3b-aa6c12e9df61 (Agent Compose 6db32162)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "ed03126c-7215-4f9c-bf3b-aa6c12e9df61",
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
  "contact_id": "ed03126c-7215-4f9c-bf3b-aa6c12e9df61",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities between our teams. Given your expertise in the field, I believe there could be mutual benefits to discuss.\n\nPlease let me know a suitable time for a brief call or meeting to explore this further.\n\nThank you for your consideration.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities between our teams. Given your expertise in the field, I believe there could be mutual benefits to discuss.

Please let me know a suitable time for a brief call or meeting to explore this further.

Thank you for your consideration.

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
  "request_id": "req_21274e18aa064aaa840a58f8a2956f27"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false