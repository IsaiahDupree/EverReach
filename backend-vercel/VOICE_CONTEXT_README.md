# 🎙️ Voice Context Feature - Quick Reference

## ✅ Status: **READY TO TEST**

---

## 🚀 **Run Tests NOW**

### **Quick Test (1 command):**

```bash
cd backend/backend-vercel
npm run test:voice-context
```

### **Or using bash:**

```bash
npm run test:voice-context:bash
```

### **Manual curl test:**

```bash
# Baseline (no voice context)
curl -X POST http://localhost:3000/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "follow up about our meeting",
    "to": {"name": "Sarah"},
    "tone": "friendly"
  }'

# With Gen Z voice context
curl -X POST http://localhost:3000/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "follow up about our meeting",
    "to": {"name": "Sarah"},
    "tone": "friendly",
    "voiceContext": "Gen Z casual - use modern slang, keep it short and real"
  }'
```

---

## 📋 **What Was Implemented**

### **✅ Database:**
- Added `voice_context` column to `profiles` table
- Created index for performance
- Migration: `20251122180446_add_voice_context_to_profiles`

### **✅ Backend:**
- Updated validation schema (voiceContext field)
- Modified message craft endpoint to use voice context
- Voice context included in AI prompts

### **✅ Mobile App:**
- Voice & Tone UI section added
- Local storage working
- Ready to use backend API

### **✅ Tests:**
- TypeScript test suite
- Bash test script
- Comprehensive testing guide

---

## 📁 **Key Files**

### **Code Changes:**
- `lib/validation.ts` - Validation schema
- `app/api/messages/craft/route.ts` - Message generation
- `profiles` table - Database column

### **Tests:**
- `scripts/test-voice-context.ts` - Main test suite
- `scripts/test-voice-context.sh` - Quick bash test

### **Documentation:**
- `VOICE_CONTEXT_STATUS.md` - ⭐ **START HERE** - Implementation status
- `VOICE_CONTEXT_TESTING_GUIDE.md` - How to test thoroughly
- `VOICE_CONTEXT_BACKEND_UPDATES.md` - Technical details
- `VOICE_CONTEXT_QUICK_START.md` - Fast setup guide

### **Migrations:**
- `VOICE_CONTEXT_MIGRATION_SIMPLE.sql` - Applied migration
- `VOICE_CONTEXT_MIGRATION_FULL.sql` - Advanced option
- `VOICE_CONTEXT_ROLLBACK.sql` - Rollback if needed

---

## 🎯 **What to Expect**

When you run tests, you'll see messages generated with different voice contexts:

| Voice Context | Expected Output |
|---------------|-----------------|
| **Baseline** | Professional, neutral |
| **Gen Z** | Casual, slang, emojis |
| **Fintech Pro** | Brief, data-driven |
| **Southern** | Warm, "y'all", hospitable |
| **NYC** | Direct, no fluff, fast |

---

## ✅ **Success Checklist**

Voice context is working if:

- [x] Tests run without errors
- [x] Messages are different for each voice context
- [x] Tone matches the description
- [x] Regional phrases appear (e.g., "y'all")
- [x] Formality shifts appropriately
- [x] Length varies (NYC = shorter)

---

## 🔧 **Quick Commands**

```bash
# Run comprehensive test
npm run test:voice-context

# Quick bash test
npm run test:voice-context:bash

# Start dev server (if not running)
npm run dev

# Check backend is up
curl http://localhost:3000/api/health

# View test script
cat scripts/test-voice-context.ts

# View bash test
cat scripts/test-voice-context.sh
```

---

## 📊 **Example Comparison**

### **Baseline:**
```
Hi Sarah,

I hope you're doing well. I wanted to follow up on our meeting 
last week about the Q4 marketing strategy.

Would you be available for a call this week?

Best regards,
```

### **Gen Z Casual:**
```
hey Sarah! 👋

Quick follow-up on our meeting last week - the Q4 strategy 
discussion was fire! Would love to hop on a call this week 
to keep the convo going.

lmk what works!
```

### **Professional Fintech:**
```
Sarah,

Re: Q4 Strategy Follow-up

Available for 15-min sync this week to discuss next steps?

Best,
```

---

## 🚨 **Troubleshooting**

### **Test fails to run:**
```bash
# Install tsx if needed
npm install -g tsx

# Or use npx
npx tsx scripts/test-voice-context.ts
```

### **Messages look the same:**
1. Check OpenAI API key: `echo $OPENAI_API_KEY`
2. Verify not in stub mode: `echo $OPENAI_STUB`
3. Check backend logs
4. Make voice context more specific

### **API errors:**
1. Ensure backend is running: `npm run dev`
2. Check port: `lsof -i :3000`
3. Verify migrations applied
4. Check validation schema

---

## 📚 **Full Documentation**

For more details, see:

- **`VOICE_CONTEXT_STATUS.md`** - Complete implementation status
- **`VOICE_CONTEXT_TESTING_GUIDE.md`** - Detailed testing instructions
- **`VOICE_CONTEXT_BACKEND_UPDATES.md`** - All technical details

---

## 💡 **Tips**

### **Good Voice Contexts:**
✅ "Gen Z casual - use slang like 'bet', 'lowkey', emojis okay"
✅ "Professional but warm - businesslike, no slang, concise"
✅ "Southern hospitality - warm, use 'y'all', genuine"

### **Too Vague:**
❌ "casual"
❌ "professional"
❌ "friendly"

---

## 🎉 **Ready to Test!**

Run this now to see voice context in action:

```bash
npm run test:voice-context
```

**You should see 6 different messages, each with a unique personality! 🚀**

---

**Questions?** Check `VOICE_CONTEXT_TESTING_GUIDE.md` for comprehensive troubleshooting.

**Status:** ✅ **COMPLETE & READY**
**Last Updated:** November 22, 2025
