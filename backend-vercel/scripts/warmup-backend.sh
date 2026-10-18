#!/bin/bash

echo "🔥 Warming up backend API routes..."
echo ""

BASE_URL="http://localhost:3000"

# Health check
echo "1/8 Health..."
curl -s "$BASE_URL/api/health" > /dev/null && echo "✅ Health"

# Entitlements
echo "2/8 Entitlements..."
curl -s "$BASE_URL/api/v1/me/entitlements" > /dev/null && echo "✅ Entitlements"

# Contacts
echo "3/8 Contacts..."
curl -s "$BASE_URL/api/v1/contacts?limit=10" > /dev/null && echo "✅ Contacts"

# Interactions
echo "4/8 Interactions..."
curl -s "$BASE_URL/api/v1/interactions?limit=10" > /dev/null && echo "✅ Interactions"

# Persona notes
echo "5/8 Persona Notes..."
curl -s "$BASE_URL/api/v1/me/persona-notes?type=voice" > /dev/null && echo "✅ Persona Notes"

# Billing restore
echo "6/8 Billing..."
curl -s -X POST "$BASE_URL/api/v1/billing/restore" -H "Content-Type: application/json" -d '{}' > /dev/null && echo "✅ Billing"

# Paywall config
echo "7/8 Paywall..."
curl -s "$BASE_URL/api/v1/config/paywall-live?platform=ios" > /dev/null && echo "✅ Paywall"

# Events tracking
echo "8/8 Events..."
curl -s -X POST "$BASE_URL/api/v1/events/track" -H "Content-Type: application/json" -d '{"event":"warmup","properties":{}}' > /dev/null && echo "✅ Events"

echo ""
echo "✅ Backend warmed up! All routes compiled and cached."
