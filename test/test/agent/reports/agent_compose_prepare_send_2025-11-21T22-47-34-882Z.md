# Agent Test: Compose → Prepare → Send

- **Contact**: ed9e53e2-2340-4d0d-8294-d4c6e16f878a (Agent Compose 9bca8182)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "ed9e53e2-2340-4d0d-8294-d4c6e16f878a",
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
  "contact_id": "ed9e53e2-2340-4d0d-8294-d4c6e16f878a",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities that may align with our respective goals. Given the recent developments in our industry, I believe there could be mutual benefits in discussing our strategies.\n\nCould we schedule a brief call to discuss this further? Please let me know your availability.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities that may align with our respective goals. Given the recent developments in our industry, I believe there could be mutual benefits in discussing our strategies.

Could we schedule a brief call to discuss this further? Please let me know your availability.

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
  "request_id": "req_1ebbf79bb3f24806a5bef4a064c54b99"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false