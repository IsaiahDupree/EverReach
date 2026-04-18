# Deeplink and Universal Link Testing (QA-007)

## Deeplink Scheme

### App Scheme
- Scheme: `everreach://`
- Base format: `everreach://[screen]/[params]`

### Universal Link Domain
- Domain: `everreach.app`
- HTTPS required
- Apple App Site Association configured

## Tested Routes

### Authentication Flows
- [x] `everreach://login`
- [x] `everreach://signup`
- [x] `everreach://reset-password?email=user@example.com`

### Content Navigation
- [x] `everreach://contacts`
- [x] `everreach://contact/[id]`
- [x] `everreach://interactions/[contactId]`
- [x] `everreach://notes/[contactId]`

### Paywall and Subscriptions
- [x] `everreach://paywall`
- [x] `everreach://upgrade`
- [x] `everreach://settings/subscription`

### Share Links
- [x] `https://everreach.app/share/contact/[id]`
- [x] `https://everreach.app/share/note/[id]`

## Testing Results

### Deeplink Tests
- [x] Valid deeplinks open correct screen
- [x] Parameters are passed correctly
- [x] Invalid deeplinks show error or default screen
- [x] Deeplinks work from:
  - Safari address bar
  - Messages
  - Email
  - Third-party apps

### Universal Link Tests
- [x] Links from Safari open in app
- [x] Links from email open in app
- [x] Links from web redirect to app
- [x] Domain association verified

## Troubleshooting

### Common Issues
- Universal link not working: Check apple-app-site-association file
- Deeplink not routing: Verify route mapping in navigation config
- Parameters not passing: Check parameter encoding

### Debug Commands
```bash
# Test universal link
xcrun simctl openurl booted "https://everreach.app/share/contact/123"

# View app linking configuration
ls -la ios-app/apple-app-site-association
```
