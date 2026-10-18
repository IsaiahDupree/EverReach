# API & Database Reference

## 📚 Overview

This folder contains complete documentation for all Supabase database operations and Vercel API endpoints in the Personal CRM system.

## 📂 Documentation Structure

### Supabase Database
- **[01-supabase-overview.md](./01-supabase-overview.md)** - Database architecture and tables
- **[02-supabase-tables.md](./02-supabase-tables.md)** - All database tables and schemas
- **[03-supabase-queries.md](./03-supabase-queries.md)** - Common query patterns
- **[04-supabase-operations.md](./04-supabase-operations.md)** - CRUD operations by table

### Vercel API Endpoints
- **[05-vercel-overview.md](./05-vercel-overview.md)** - API architecture and organization
- **[06-vercel-endpoints.md](./06-vercel-endpoints.md)** - Complete endpoint reference
- **[07-vercel-authentication.md](./07-vercel-authentication.md)** - Auth patterns and middleware
- **[08-vercel-integration.md](./08-vercel-integration.md)** - How to call from frontend

### Quick Reference
- **[09-quick-reference.md](./09-quick-reference.md)** - Cheat sheet for common operations
- **[10-error-handling.md](./10-error-handling.md)** - Error codes and handling patterns

## 🎯 Quick Links

### Most Used Operations

**Database:**
- Contacts CRUD → [04-supabase-operations.md#contacts](./04-supabase-operations.md#contacts)
- Messages/Interactions → [04-supabase-operations.md#interactions](./04-supabase-operations.md#interactions)
- Voice Notes → [04-supabase-operations.md#persona-notes](./04-supabase-operations.md#persona-notes)

**API Endpoints:**
- Contacts API → [06-vercel-endpoints.md#contacts](./06-vercel-endpoints.md#contacts)
- Messages API → [06-vercel-endpoints.md#messages](./06-vercel-endpoints.md#messages)
- Agent AI → [06-vercel-endpoints.md#agent](./06-vercel-endpoints.md#agent)

## 🔐 Security & Access

- All Supabase tables use Row Level Security (RLS)
- All Vercel API endpoints require authentication
- Service keys are used only in server-side operations

## 📊 Statistics

- **Database Tables**: 30+
- **API Endpoints**: 80+
- **Agent AI Endpoints**: 12
- **Webhook Endpoints**: 4
- **TRPC Procedures**: 20+

## 🚀 Getting Started

1. Read [01-supabase-overview.md](./01-supabase-overview.md) for database architecture
2. Read [05-vercel-overview.md](./05-vercel-overview.md) for API structure
3. Use [09-quick-reference.md](./09-quick-reference.md) for copy-paste examples
4. Reference specific docs as needed

## 🔗 Related Documentation

- Agent Integration Guide: [../agent-integration/](../agent-integration/)
- Backend System Docs: [../../AGENT_SYSTEM_DOCUMENTATION.md](../../AGENT_SYSTEM_DOCUMENTATION.md)
