# Security Best Practices

## Protecting Your App and User Data

This guide covers essential security measures for production apps.

---

## Environment Variables

### Never Commit Secrets

```bash
# .gitignore - MUST INCLUDE:
.env
.env.local
.env.*.local
*.pem
*.key
```

### Separate Keys by Environment

```
# .env.development
EXPO_PUBLIC_SUPABASE_URL=https://dev-xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ_dev_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://prod-xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ_prod_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Client vs Server Keys

| Key Type | Where to Use | Safe to Expose? |
|----------|--------------|-----------------|
| `SUPABASE_ANON_KEY` | Client (app) | ✅ Yes, with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ❌ Never |
| `STRIPE_PUBLISHABLE_KEY` | Client (app) | ✅ Yes |
| `STRIPE_SECRET_KEY` | Server only | ❌ Never |

---

## Row Level Security (RLS)

### Always Enable RLS

```sql
-- Enable RLS on every table with user data
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Verify it's enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Essential Policies

```sql
-- Users can only see their own data
CREATE POLICY "Users read own data"
ON public.items FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users insert own data"
ON public.items FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "Users update own data"
ON public.items FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "Users delete own data"
ON public.items FOR DELETE
USING (auth.uid() = user_id);
```

### Service Role Access

```sql
-- Allow backend to bypass RLS for admin operations
CREATE POLICY "Service role full access"
ON public.items FOR ALL
USING (auth.role() = 'service_role');
```

---

## Authentication Security

### Password Requirements

Configure in Supabase Dashboard → Auth → Settings:
- Minimum 8 characters
- Require uppercase
- Require number
- Require special character

### Rate Limiting

Supabase has built-in rate limiting. For custom endpoints:

```typescript
// Simple rate limiter
const rateLimits = new Map<string, number[]>();

function rateLimit(ip: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const requests = rateLimits.get(ip) || [];
  
  // Remove old requests
  const recent = requests.filter(time => now - time < windowMs);
  
  if (recent.length >= limit) {
    return false; // Rate limited
  }
  
  recent.push(now);
  rateLimits.set(ip, recent);
  return true;
}
```

### Secure Session Handling

```typescript
// Don't store sensitive data in session
const { data: { session } } = await supabase.auth.getSession();

// Good: Store user ID
const userId = session?.user?.id;

// Bad: Don't store access token in state
// const token = session?.access_token; // ❌
```

---

## API Security

### Validate All Inputs

```typescript
import { z } from 'zod';

const CreateItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(['work', 'personal', 'other']),
});

export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate input
  const result = CreateItemSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  
  // Use validated data
  const { name, description, category } = result.data;
  // ...
}
```

### Verify Webhook Signatures

```typescript
// Stripe webhook verification
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    // Process verified event
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }
}
```

### CORS Configuration

```typescript
// Only allow your domains
const allowedOrigins = [
  'https://yourapp.com',
  'https://app.yourapp.com',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000',
].filter(Boolean);

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  
  if (allowedOrigins.includes(origin)) {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  return new Response(null, { status: 403 });
}
```

---

## Data Protection

### Encrypt Sensitive Data

```typescript
// For highly sensitive data, encrypt before storing
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### Audit Logging

```sql
-- Create audit log table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to sensitive tables
CREATE TRIGGER audit_items
AFTER INSERT OR UPDATE OR DELETE ON public.items
FOR EACH ROW EXECUTE FUNCTION log_changes();
```

---

## Mobile-Specific Security

### Secure Storage

```typescript
import * as SecureStore from 'expo-secure-store';

// Store sensitive data securely
await SecureStore.setItemAsync('api_token', token);

// Retrieve
const token = await SecureStore.getItemAsync('api_token');

// Delete
await SecureStore.deleteItemAsync('api_token');
```

### Certificate Pinning (Advanced)

For high-security apps, pin your API certificate:

```typescript
// In app.json
{
  "expo": {
    "extra": {
      "certificatePins": {
        "api.yourapp.com": ["sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="]
      }
    }
  }
}
```

### Obfuscation

For production builds, enable Hermes and minification:

```json
// app.json
{
  "expo": {
    "jsEngine": "hermes",
    "extra": {
      "eas": {
        "build": {
          "production": {
            "env": {
              "EXPO_NO_TELEMETRY": "1"
            }
          }
        }
      }
    }
  }
}
```

---

## Security Checklist

### Before Launch

- [ ] All secrets in environment variables (not code)
- [ ] RLS enabled on all tables with user data
- [ ] RLS policies tested thoroughly
- [ ] Input validation on all API endpoints
- [ ] Webhook signatures verified
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] HTTPS enforced everywhere
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging for sensitive operations

### Ongoing

- [ ] Monitor Supabase Auth logs for suspicious activity
- [ ] Review and rotate API keys periodically
- [ ] Keep dependencies updated (security patches)
- [ ] Regular security audits

---

## Reporting Vulnerabilities

If you discover a security vulnerability:
1. **Do not** create a public GitHub issue
2. Email: security@yourapp.com
3. Include detailed reproduction steps
4. Allow reasonable time for a fix
