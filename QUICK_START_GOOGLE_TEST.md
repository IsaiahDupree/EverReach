# Quick Start: Test Google Contacts Import

## TL;DR - Run This

```powershell
# Step 1: Get OAuth tokens (one-time setup)
.\get-google-oauth-token.ps1

# Step 2: Test the import
node test-google-contacts-import.mjs
```

## What You Need First

1. Google Cloud credentials in `.env`:
   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/contacts/import/google/callback
   ```

2. If you don't have these, follow: `GOOGLE_CONTACTS_IMPORT_SETUP.md`

## Expected Result

```
✅ Fetched 250 contacts

📊 Import Statistics:
   Total Contacts: 250
   With Email: 230 (92%)
   With Phone: 180 (72%)
```

## Troubleshooting

**Error: Missing GOOGLE_CLIENT_ID**
- Add credentials to `.env` file

**Error: Missing GOOGLE_REFRESH_TOKEN**
- Run `.\get-google-oauth-token.ps1` first

**No contacts returned**
- Check https://contacts.google.com in browser
- Make sure test account has contacts

## Using Your Account

The script will use: **isaiahdupree33@gmail.com**

To use a different account:
```powershell
.\get-google-oauth-token.ps1 -Email "different@gmail.com"
```
