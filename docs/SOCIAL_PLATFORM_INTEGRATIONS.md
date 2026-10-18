# 📱 Social Platform Integrations

**Created**: October 23, 2025  
**Status**: Production Ready  
**Platforms**: WhatsApp Business, Instagram Business, Facebook Ads

---

## 🎯 Overview

Comprehensive integrations with major social platforms for messaging, analytics, and advertising.

### **Features**
- ✅ WhatsApp Business messaging
- ✅ Instagram account stats and insights
- ✅ Facebook Ads campaign management
- ✅ Automated testing suite
- ✅ Secure credential management

---

## 📊 APIs Implemented

### **1. WhatsApp Business API**
**Endpoint**: `POST /api/v1/integrations/whatsapp/send`

**Features**:
- Send template messages
- Send text messages
- Message delivery tracking
- Template support (hello_world, custom)

**Use Cases**:
- Customer notifications
- Order confirmations
- Support responses
- Marketing campaigns

### **2. Instagram Business API**
**Endpoint**: `GET /api/v1/integrations/instagram/stats`

**Features**:
- Account statistics
- Follower metrics
- Media insights
- Engagement analytics

**Metrics**:
- Followers count
- Following count
- Media count
- Recent posts performance
- Likes & comments

### **3. Facebook Ads Marketing API**
**Endpoints**:
- `GET /api/v1/integrations/facebook-ads/campaigns` - List campaigns
- `POST /api/v1/integrations/facebook-ads/campaigns` - Create campaign

**Features**:
- Campaign listing
- Campaign creation
- Budget management
- Performance metrics (spend, impressions, CPC, CPM)

---

## 🔐 Configuration

### **Step 1: Add Credentials to .env**

```bash
# WhatsApp Business
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token

# Instagram Business
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
INSTAGRAM_APP_ID=602248125600338
INSTAGRAM_APP_SECRET=your_app_secret

# Facebook Ads
FB_ADS_ACCESS_TOKEN=your_fb_ads_token
FB_ADS_APP_ID=453049510987286
FB_ADS_ACCOUNT_ID=act_1130334212412487
```

### **Step 2: Get API Tokens**

#### **WhatsApp Business**
1. Go to https://developers.facebook.com/apps
2. Create or select your app
3. Add WhatsApp product
4. Get access token from API settings
5. Note your Phone Number ID: `851190418074116`

#### **Instagram Business**
1. Go to https://developers.facebook.com/apps
2. App: `check_stats_4-IG`
3. Navigate to Instagram Basic Display
4. Generate User Access Token
5. Token includes permissions: `instagram_basic`, `instagram_manage_insights`

#### **Facebook Ads**
1. Go to https://developers.facebook.com/apps
2. Create Marketing API app
3. Get access token with permissions:
   - `ads_management`
   - `ads_read`
   - `business_management`
4. Note your Ad Account ID: `act_1130334212412487`

---

## 📝 API Usage Examples

### **1. Send WhatsApp Template Message**

```typescript
POST /api/v1/integrations/whatsapp/send
Authorization: Bearer YOUR_JWT_TOKEN

{
  "to": "12177996721",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": {
      "code": "en_US"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "message_id": "wamid.HBgLMTIxNzc5OTY3MjEVAgARGBI1RjRBQzk2QkY2RDhENzVEQjEA",
  "sent_to": "12177996721",
  "type": "template"
}
```

### **2. Send WhatsApp Text Message**

```typescript
POST /api/v1/integrations/whatsapp/send
Authorization: Bearer YOUR_JWT_TOKEN

{
  "to": "12177996721",
  "type": "text",
  "message": "Hello from our platform!"
}
```

### **3. Get Instagram Stats**

```typescript
GET /api/v1/integrations/instagram/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "account": {
    "id": "123456789",
    "username": "your_account",
    "followers_count": 5000,
    "follows_count": 250,
    "media_count": 120
  },
  "recent_media": [
    {
      "id": "post123",
      "caption": "Recent post",
      "like_count": 150,
      "comments_count": 25
    }
  ]
}
```

### **4. List Facebook Ad Campaigns**

```typescript
GET /api/v1/integrations/facebook-ads/campaigns?limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "120206456720680123",
      "name": "Traffic Campaign",
      "objective": "OUTCOME_TRAFFIC",
      "status": "ACTIVE",
      "insights": {
        "spend": "150.00",
        "impressions": "50000",
        "clicks": "2500",
        "ctr": "5.0"
      }
    }
  ],
  "total_count": 5
}
```

### **5. Create Facebook Ad Campaign**

```typescript
POST /api/v1/integrations/facebook-ads/campaigns
Authorization: Bearer YOUR_JWT_TOKEN

{
  "name": "New Traffic Campaign",
  "objective": "OUTCOME_TRAFFIC",
  "status": "PAUSED",
  "special_ad_categories": []
}
```

**Response**:
```json
{
  "success": true,
  "campaign_id": "120206456720680124",
  "name": "New Traffic Campaign",
  "objective": "OUTCOME_TRAFFIC",
  "status": "PAUSED"
}
```

---

## 🧪 Testing

### **Run Integration Tests**

```bash
node test/agent/integration-social-platforms.mjs
```

**Test Coverage**:
1. ✅ WhatsApp template message send
2. ✅ Instagram account stats fetch
3. ✅ Facebook Ads campaign listing
4. ✅ Facebook Ads campaign creation

**Expected Output**:
```
✅ WhatsApp template message sent successfully
✅ Instagram stats fetched successfully  
✅ Facebook Ads campaigns fetched successfully
✅ Facebook Ads campaign created (PAUSED)
```

### **Test Reports**

Reports generated in: `test/agent/reports/social_platforms_*.md`

---

## 🔒 Security Best Practices

### **1. Credential Management**
- ✅ Store tokens in `.env` file
- ✅ Never commit tokens to git
- ✅ Use environment variables in production
- ✅ Rotate tokens regularly (every 60-90 days)

### **2. API Authentication**
- ✅ All endpoints require JWT authentication
- ✅ Service role key for backend operations
- ✅ Rate limiting applied
- ✅ Error messages don't expose tokens

### **3. Production Deployment**
```bash
# Set environment variables in Vercel
vercel env add WHATSAPP_ACCESS_TOKEN
vercel env add INSTAGRAM_ACCESS_TOKEN
vercel env add FB_ADS_ACCESS_TOKEN
```

---

## 📊 Rate Limits & Quotas

### **WhatsApp Business**
- **Tier 1**: 1,000 conversations/24h
- **Tier 2**: 10,000 conversations/24h (after approval)
- **Tier 3**: 100,000 conversations/24h (after approval)
- **Message Templates**: Must be pre-approved

### **Instagram Business**
- **API Calls**: 200 calls/user/hour
- **Rate Limit**: Standard Graph API limits apply
- **Data Access**: Requires Business account

### **Facebook Ads**
- **API Calls**: 200 calls/user/hour
- **Rate Limit**: Subject to ad account tier
- **Budget**: Set daily/lifetime budgets

---

## ⚠️ Error Handling

### **Common Errors**

**1. Token Not Configured**
```json
{
  "error": "WhatsApp API token not configured",
  "status": 500
}
```
**Fix**: Add `WHATSAPP_ACCESS_TOKEN` to `.env`

**2. Invalid Token**
```json
{
  "error": "Failed to send WhatsApp message",
  "details": "Invalid OAuth access token"
}
```
**Fix**: Regenerate token from Facebook Developer Console

**3. Rate Limit Exceeded**
```json
{
  "error": "Rate limit exceeded",
  "details": "Too many requests"
}
```
**Fix**: Implement exponential backoff, wait before retry

**4. Invalid Phone Number**
```json
{
  "error": "Failed to send WhatsApp message",
  "details": "Phone number not registered"
}
```
**Fix**: Verify phone number format (+country code)

---

## 📈 Usage Analytics

### **Track Integration Performance**

```sql
-- Log integration usage
INSERT INTO integration_logs (
  platform,
  endpoint,
  user_id,
  status,
  response_time_ms
) VALUES (
  'whatsapp',
  '/send',
  'user_123',
  'success',
  250
);

-- Query usage statistics
SELECT 
  platform,
  COUNT(*) as total_calls,
  AVG(response_time_ms) as avg_response_time,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_calls
FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY platform;
```

---

## 🚀 Deployment Checklist

- [ ] Add all tokens to `.env` or Vercel environment
- [ ] Test each endpoint manually
- [ ] Run automated test suite
- [ ] Verify rate limits
- [ ] Set up monitoring/alerts
- [ ] Document for team
- [ ] Configure error tracking (Sentry)
- [ ] Set up usage analytics

---

## 📞 Support & Resources

### **Official Documentation**
- **WhatsApp**: https://developers.facebook.com/docs/whatsapp
- **Instagram**: https://developers.facebook.com/docs/instagram-api
- **Facebook Ads**: https://developers.facebook.com/docs/marketing-apis

### **API Playgrounds**
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer
- **WhatsApp Test**: https://business.facebook.com/wa/manage/phone-numbers/

### **Status Pages**
- **Facebook Status**: https://status.fb.com
- **Meta for Developers**: https://developers.facebook.com/status

---

## 🎯 Next Steps

### **Enhancements**
1. Add webhook handlers for incoming WhatsApp messages
2. Implement Instagram Direct Message integration
3. Add Facebook Ads performance reporting
4. Create campaign optimization algorithms
5. Build unified analytics dashboard

### **Advanced Features**
- WhatsApp chatbot integration
- Instagram story automation
- A/B testing for ad campaigns
- Automated budget optimization
- Multi-platform analytics

---

*Last Updated: October 23, 2025*  
*Version: 1.0.0*  
*Status: Production Ready* ✅
