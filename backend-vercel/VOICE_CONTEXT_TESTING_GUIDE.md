# Voice Context Testing Guide

## ✅ **Backend Updates Applied**

### **What Was Updated:**

1. ✅ **Supabase Migration:** `voice_context` column added to `profiles` table
2. ✅ **Validation Schema:** `voiceContext` field added with 500 char max
3. ✅ **Message Craft Endpoint:** Voice context included in AI prompts

---

## 🧪 **How to Test**

### **Option 1: Automated Test Script (Recommended)**

Run the comprehensive test that compares messages with different voice contexts:

```bash
# TypeScript version (more detailed)
cd backend/backend-vercel
npx tsx scripts/test-voice-context.ts

# Bash version (quick & simple)
./scripts/test-voice-context.sh
```

**What it does:**
- Generates baseline message (no voice context)
- Generates messages with 5 different voice contexts:
  - Gen Z Casual
  - Professional Fintech
  - Southern Charm
  - Arizona Local
  - NYC Direct
- Compares results to show differences

---

### **Option 2: Manual curl Tests**

Test individual voice contexts:

#### **1. Baseline (No Voice Context)**
```bash
curl -X POST http://localhost:3000/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "follow up about our meeting",
    "context": "We discussed Q4 strategy",
    "to": {"name": "Sarah"},
    "tone": "friendly"
  }'
```

#### **2. Gen Z Casual**
```bash
curl -X POST http://localhost:3000/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "follow up about our meeting",
    "context": "We discussed Q4 strategy",
    "to": {"name": "Sarah"},
    "tone": "friendly",
    "voiceContext": "Gen Z casual with tech vibes - use contemporary slang, keep it real"
  }'
```

#### **3. Professional Fintech**
```bash
curl -X POST http://localhost:3000/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "follow up about our meeting",
    "context": "We discussed Q4 strategy",
    "to": {"name": "Sarah"},
    "tone": "friendly",
    "voiceContext": "Professional fintech executive - data-driven, concise, businesslike"
  }'
```

#### **4. Southern Charm**
```bash
curl -X POST http://localhost:3000/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "follow up about our meeting",
    "context": "We discussed Q4 strategy",
    "to": {"name": "Sarah"},
    "tone": "friendly",
    "voiceContext": "Southern US style - warm, use regional phrases like y'\''all, genuine hospitality"
  }'
```

---

### **Option 3: Thunder Client / Postman**

Create a collection with these requests:

**Endpoint:** `POST http://localhost:3000/api/messages/craft`

**Headers:**
```
Content-Type: application/json
```

**Body Examples:**

**Test 1 - Baseline:**
```json
{
  "purpose": "follow up about our meeting last week",
  "context": "We discussed Q4 marketing strategy",
  "to": {"name": "Sarah", "email": "sarah@example.com"},
  "tone": "friendly"
}
```

**Test 2 - With Voice Context:**
```json
{
  "purpose": "follow up about our meeting last week",
  "context": "We discussed Q4 marketing strategy",
  "to": {"name": "Sarah", "email": "sarah@example.com"},
  "tone": "friendly",
  "voiceContext": "Gen Z casual - use modern slang, keep it short and friendly"
}
```

---

## 📊 **What to Look For**

### **Baseline vs Voice Context Differences:**

| Aspect | Baseline | Gen Z | Fintech Pro | Southern |
|--------|----------|-------|-------------|----------|
| **Length** | Medium | Short | Very short | Medium-long |
| **Formality** | Professional | Very casual | Business | Friendly |
| **Slang** | None | Yes ("lit", "fire") | None | Regional ("y'all") |
| **Energy** | Neutral | High | Direct | Warm |
| **Emojis** | No | Possibly | No | No |

---

## ✅ **Success Criteria**

The voice context feature is working if:

1. ✅ **Messages are different** when voice context is provided
2. ✅ **Style matches** the voice context description
3. ✅ **Regional phrases** appear when specified (e.g., "y'all" for Southern)
4. ✅ **Tone shifts** appropriately (casual vs professional)
5. ✅ **Length varies** based on context (NYC direct = shorter)

---

## 🔍 **Example Expected Outputs**

### **Baseline (No Voice Context):**
```
Subject: Following Up

Hi Sarah,

I hope you're doing well. I wanted to follow up on our meeting last week 
about the Q4 marketing strategy. You seemed interested in the discussion.

Would you be available for a call this week to continue our conversation?

Best regards,
Your Name
```

### **Gen Z Casual:**
```
hey Sarah! 👋

Quick follow-up on our meeting last week - the Q4 strategy discussion was 
fire! Would love to hop on a call this week to keep the convo going. 

lmk what works for you!

peace ✌️
```

### **Professional Fintech:**
```
Sarah,

Re: Q4 Strategy Follow-up

Quick sync request: available for 15-min call this week to discuss next 
steps per last week's meeting?

Best,
Your Name
```

### **Southern Charm:**
```
Hey Sarah!

Hope y'all are doing well! I really enjoyed our conversation last week 
about the Q4 marketing strategy. You had some wonderful insights.

Would you have time for a quick call this week? I'd love to continue 
our discussion.

Looking forward to hearing from you!

Warm regards,
Your Name
```

---

## 🚨 **Troubleshooting**

### **Problem: Messages all look the same**

**Check:**
1. OpenAI API key is set: `echo $OPENAI_API_KEY`
2. Not in stub mode: `echo $OPENAI_STUB` (should be empty or false)
3. Backend changes deployed
4. Request includes `voiceContext` field

**Solution:**
```bash
# Verify validation accepts voiceContext
curl -X POST http://localhost:3000/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{"purpose": "test"}' # Should fail validation

# Check logs for prompt construction
tail -f logs/application.log
```

### **Problem: API returns validation error**

**Error:** `"voiceContext must be a string"`

**Solution:** Check your request format:
```json
{
  "voiceContext": "Your voice context here",  // ✅ Correct
  "voice_context": "...",                      // ❌ Wrong field name
}
```

### **Problem: No difference in tone**

**Possible causes:**
1. Voice context too vague - be more specific
2. OpenAI model ignoring instructions - try different prompts
3. Backend not including voice context in prompt - check logs

**Better voice contexts:**
- ❌ "casual" (too vague)
- ✅ "Gen Z casual - use slang like 'bet', 'lowkey', keep it short and friendly"

---

## 📈 **Performance Notes**

- **Latency:** Voice context adds ~50-100ms due to longer prompt
- **Token usage:** Increases by ~20-30 tokens per request
- **Rate limit:** Still 30 req/min (unchanged)
- **Max voice context:** 500 characters

---

## 🎯 **Quick Validation Checklist**

- [ ] Backend starts without errors
- [ ] Validation accepts `voiceContext` field
- [ ] Baseline message generates successfully
- [ ] Message with voice context generates successfully
- [ ] Messages are visibly different
- [ ] Tone matches voice context description
- [ ] Regional phrases appear when specified
- [ ] Formality level shifts appropriately

---

## 📚 **Additional Resources**

- **Full docs:** `VOICE_CONTEXT_BACKEND_UPDATES.md`
- **Quick start:** `VOICE_CONTEXT_QUICK_START.md`
- **Migration SQL:** `VOICE_CONTEXT_MIGRATION_SIMPLE.sql`
- **TypeScript test:** `scripts/test-voice-context.ts`
- **Bash test:** `scripts/test-voice-context.sh`

---

## 🚀 **Next Steps After Testing**

Once tests pass:

1. ✅ **Deploy to staging**
2. ✅ **Test with real users**
3. ✅ **Monitor message quality**
4. ✅ **Collect feedback**
5. ✅ **(Optional) Add preferences API for cloud sync**

---

## 💡 **Pro Tips**

### **Best Voice Contexts:**

✅ **Good:**
- "Gen Z casual - use slang like 'bet', 'lowkey', emojis okay, keep it short"
- "Professional but warm - businesslike tone, no slang, concise, friendly closing"
- "Southern hospitality - warm, use 'y'all', mention weather/community, genuine"

❌ **Too Vague:**
- "casual" (what kind of casual?)
- "professional" (every industry has different norms)
- "friendly" (baseline is already friendly)

### **Testing Best Practices:**

1. **Test extremes:** Very casual vs very formal
2. **Test regions:** Different geographic styles
3. **Test industries:** Tech, finance, healthcare, etc.
4. **Test lengths:** Short vs detailed preferences
5. **Test edge cases:** Empty string, max length, special characters

---

**Happy Testing! 🎉**

If voice context is working correctly, you should see clear personality differences in generated messages that match the specified style! 🚀
