# CORS Validation Report

**Generated:** 2025-10-21T04:13:18.727Z
**Backend:** https://ever-reach-be.vercel.app

## Summary

- ✅ **Passed:** 0
- ❌ **Failed:** 15
- 📈 **Total:** 15
- 🎯 **Success Rate:** 0.0%

## Test Details

### ❌ OPTIONS /api/v1/warmth/summary

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/v1/warmth/summary (authenticated)

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/v1/warmth/summary (401 error)

- **Status:** 401 Unauthorized
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ OPTIONS /api/v1/interactions

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/v1/interactions (authenticated)

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/v1/interactions (401 error)

- **Status:** 401 Unauthorized
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ OPTIONS /api/v1/interactions

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ POST /api/v1/interactions (authenticated)

- **Status:** 500 Internal Server Error
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ POST /api/v1/interactions (401 error)

- **Status:** 401 Unauthorized
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ OPTIONS /api/v1/contacts

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/v1/contacts (authenticated)

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/v1/contacts (401 error)

- **Status:** 401 Unauthorized
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ OPTIONS /api/health

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `RSC, Next-Router-State-Tree, Next-Router-Prefetch, Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/health (authenticated)

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `RSC, Next-Router-State-Tree, Next-Router-Prefetch, Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

### ❌ GET /api/health (401 error)

- **Status:** 200 OK
- **Headers:**
  - Access-Control-Allow-Origin: `MISSING`
  - Vary: `RSC, Next-Router-State-Tree, Next-Router-Prefetch, Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,x-vercel-protection-bypass`
- **Checks:**
  - ✅ Vary: Origin header
  - ❌ Access-Control-Allow-Origin present (Missing)

