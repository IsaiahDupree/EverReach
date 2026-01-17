# EverReach Logo & Favicon Setup Instructions

## Source File
Your logo is located at: `C:\Users\Isaia\Documents\Coding\PersonalCRM push\Everreacg_Logo.png`

---

## Step 1: Copy Logo Files (Manual Step Required)

You need to manually copy the logo to these locations:

### Dashboard App (Next.js)
```
Source: C:\Users\Isaia\Documents\Coding\PersonalCRM push\Everreacg_Logo.png

Copy to:
1. C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\public\logo.png
2. C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\public\everreach-logo.png
```

### Backend (for email templates)
```
Copy to:
1. C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel\public\logo.png
2. C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\backend-vercel\public\everreach-logo.png
```

### Favicon (requires conversion)
```
You need to convert the PNG to ICO format:
1. Go to https://favicon.io/favicon-converter/
2. Upload: C:\Users\Isaia\Documents\Coding\PersonalCRM push\Everreacg_Logo.png
3. Download the generated favicon.ico
4. Replace: C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app\src\app\favicon.ico
```

---

## Step 2: Files Created (Automatic)

I've created the following files for you:

### 1. Email Template System
- `backend-vercel/lib/email-templates.ts` - HTML email templates with your logo

### 2. Dashboard Meta Tags
- Updated `dashboard-app/src/app/layout.tsx` - Added Open Graph images and meta tags

### 3. Logo Component
- `dashboard-app/src/components/Logo.tsx` - Reusable logo component

---

## Step 3: After Copying Files

### Upload Logo to Cloud Storage (for emails)

Since emails need publicly accessible URLs, upload your logo:

**Option 1: Supabase Storage**
```bash
# Upload to Supabase
1. Go to Supabase Dashboard > Storage
2. Create bucket 'public-assets' (make it public)
3. Upload logo.png
4. Get public URL: https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/public-assets/logo.png
```

**Option 2: Vercel Blob Storage**
```bash
# Install Vercel Blob
cd backend-vercel
npm install @vercel/blob

# Upload via dashboard or CLI
vercel blob upload public/logo.png
```

Then update `.env`:
```bash
# Add this to both .env files
LOGO_URL=https://your-public-url/logo.png
LOGO_URL_EMAIL=https://your-public-url/logo.png
```

---

## Step 4: Usage Examples

### In Email Templates
```typescript
import { sendEmailWithTemplate } from '@/lib/email-templates';

await sendEmailWithTemplate({
  to: 'user@example.com',
  subject: 'Welcome to EverReach',
  template: 'welcome',
  data: {
    userName: 'John',
    loginLink: 'https://app.everreach.app/login'
  }
});
```

### In Dashboard Components
```typescript
import Logo from '@/components/Logo';

<Logo size="sm" /> // 32px
<Logo size="md" /> // 48px  
<Logo size="lg" /> // 64px
<Logo className="custom-class" />
```

### Direct Image Reference
```typescript
<img src="/logo.png" alt="EverReach" />
```

---

## Step 5: Environment Variables

Add to both `.env` files:

### Dashboard App `.env.local`
```bash
NEXT_PUBLIC_LOGO_URL=/logo.png
NEXT_PUBLIC_APP_NAME=EverReach
```

### Backend `.env`
```bash
LOGO_URL=https://your-cdn-url/logo.png
EMAIL_LOGO_URL=https://your-cdn-url/logo.png
APP_NAME=EverReach
```

---

## Email Template Preview

The email templates will look like this:

```
┌─────────────────────────────┐
│   [Your EverReach Logo]     │
│                              │
│   Welcome to EverReach!      │
│                              │
│   Hi John,                   │
│   Thanks for joining...      │
│                              │
│   [Button: Get Started]      │
│                              │
│   © 2025 EverReach           │
└─────────────────────────────┘
```

---

## Verification Checklist

After setup, verify:

- [ ] Logo appears in dashboard header
- [ ] Favicon shows in browser tab
- [ ] Logo loads in email templates (send test email)
- [ ] Meta tags show logo in social media previews
- [ ] Mobile app logo updated (if applicable)

---

## Troubleshooting

### Logo not showing in emails?
- Verify LOGO_URL is a fully qualified public URL (https://...)
- Check Supabase storage bucket is public
- Test URL directly in browser

### Favicon not showing?
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check file is .ico format (not PNG)

### Logo too large/small?
- Edit the Logo component size prop
- Use CSS max-width to constrain
- Create multiple sizes (logo-sm.png, logo-lg.png)

---

## Next Steps

1. **Manual**: Copy logo files to public folders
2. **Manual**: Convert and replace favicon.ico
3. **Manual**: Upload logo to cloud storage for emails
4. **Manual**: Update .env files with LOGO_URL
5. **Test**: Send test email to verify logo appears
6. **Deploy**: Push changes to Vercel

---

**Files Created:**
- `backend-vercel/lib/email-templates.ts`
- `dashboard-app/src/components/Logo.tsx`  
- `dashboard-app/src/app/layout.tsx` (updated)

**Last Updated**: November 10, 2025
