# Agent Test: Compose → Prepare → Send

- **Contact**: 672e208f-bb18-4641-af75-a610792472ef (Agent Compose ac7d176c)

## Steps
- Compose smart: 200
- Prepare message: 201
- Send message: 500

## Inputs
### Compose payload
```json
{
  "contact_id": "672e208f-bb18-4641-af75-a610792472ef",
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
  "contact_id": "672e208f-bb18-4641-af75-a610792472ef",
  "channel": "email",
  "draft": {
    "subject": "Agent Compose Test",
    "body": "Dear Agent Compose,\n\nI hope this message finds you well. I am reaching out to explore potential collaboration opportunities between our teams. Given our shared interests in [specific area or project], I believe there could be mutual benefits to discuss.\n\nPlease let me know if you are available for a brief call next week to explore this further.\n\nBest regards,  \n[Your Name]  \n[Your Position]  \n[Your Company]  \n[Your Contact Information]"
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

I hope this message finds you well. I am reaching out to explore potential collaboration opportunities between our teams. Given our shared interests in [specific area or project], I believe there could be mutual benefits to discuss.

Please let me know if you are available for a brief call next week to explore this further.

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
  "request_id": "req_5f96f0fa8f1f480c80ee00f5c760a3b4"
}
```

## Assertions
- **Compose returned 200/201**: true
- **Prepare returned 201**: true
- **Send returned 200**: false
- **Send status 'sent'**: false
- **PASS**: false