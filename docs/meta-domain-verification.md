# Meta Domain Verification for Expo Web Apps

## Overview
This document outlines the process for verifying a domain with Meta (Facebook) for an Expo Router web application with static rendering.

## Key Requirements
Meta requires the domain verification meta tag to be in the **static HTML `<head>` section**, not dynamically injected via JavaScript.

```html
<meta name="facebook-domain-verification" content="YOUR_VERIFICATION_ID" />
```

## Implementation for Expo Router

### 1. Enable Static Output
In `app.json`, set `web.output` to `"static"`:

```json
{
  "expo": {
    "web": {
      "output": "static",
      "bundler": "metro"
    }
  }
}
```

### 2. Create `app/+html.tsx`
Expo Router uses `app/+html.tsx` to define the root HTML template for static rendering:

```tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Meta Domain Verification - Required in static HTML */}
        <meta name="facebook-domain-verification" content="YOUR_VERIFICATION_ID" />
        
        {/* Open Graph tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Your App Title" />
        <meta property="og:description" content="Your description" />
        
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Guard Browser-Only Code for SSR
Static rendering runs in Node.js where `window` and `document` are undefined. Wrap browser-only code:

```typescript
const IS_BROWSER = typeof window !== 'undefined';

if (IS_BROWSER) {
  // Browser-only initialization code
  initializePostHog();
  initializeMetaPixel();
  // etc.
}
```

## Verification Process

1. **Deploy** the site with the meta tag in `+html.tsx`
2. **View Page Source** at your domain to confirm the tag is in `<head>`
3. **Use Meta Sharing Debugger** at https://developers.facebook.com/tools/debug/
   - Enter your URL
   - Click "Scrape Again" to force a fresh fetch
4. **Verify in Meta Business Suite** → Settings → Domains → Click "Verify domain"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tag not in page source | Ensure `web.output: "static"` is set in `app.json` |
| Build fails with "window is not defined" | Wrap browser code in `IS_BROWSER` check |
| Scrape shows old data | Click "Scrape Again" in Sharing Debugger |
| Verification still fails | Wait up to 72 hours, or try DNS TXT verification |

## Related Files
- `app.json` - Expo configuration with static output
- `app/+html.tsx` - Root HTML template
- `lib/metaPixel.ts` - Meta Pixel (must be SSR-safe)
- `app/_layout.tsx` - App initialization (must guard browser code)

## Date Verified
- **Domain**: everreach.app
- **Date**: December 29, 2025
- **Method**: Meta tag via `app/+html.tsx`
