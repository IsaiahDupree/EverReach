# Evidence to Next.js Dashboard Migration

## Summary

After **17+ hours** of debugging Evidence deployment issues, we've switched to a Next.js admin dashboard using shadcn/ui.

## What We Learned from Evidence

### Issues Encountered
1. **Environment Variable Encoding**: Vercel encrypts env vars, Evidence couldn't decode them
2. **Session Pooler Compatibility**: Evidence Postgres plugin had SSL/authentication issues with Supabase Session Pooler
3. **Password Type Errors**: "client password must be a string" - YAML parsing issues
4. **Build vs Runtime**: Data needs to be fetched during build, not at runtime
5. **Schema Mismatches**: Had to fix multiple column/table name mismatches

### What Worked
- ✅ Evidence connected successfully **locally** (fetched 100 contacts)
- ✅ Correct Supabase credentials identified:
  - Host: `aws-1-us-east-2.pooler.supabase.com`
  - Port: `5432`
  - User: `postgres.utasetfxiqcrnwyfforx`
  - Password: `zVTEbBqIF4f8Himv`
  - Database: `postgres`
- ✅ All SQL queries fixed to match schema (org_id, warmth, orgs, display_name, emails)
- ✅ Domain configured: `reports.everreach.app`

## New Approach: Next.js + shadcn/ui

### Why This Will Work
1. **Proven Stack**: Next.js + Vercel = guaranteed compatibility
2. **Direct Supabase Integration**: Use Supabase JS client (no Postgres connection issues)
3. **Modern UI**: shadcn/ui components (Tailwind, Radix UI)
4. **Fast Development**: Pre-built admin template
5. **No Build Complexity**: Server-side rendering, no static data generation needed

### Template Used
- **Repo**: https://github.com/arhamkhnz/next-shadcn-admin-dashboard
- **Features**: 
  - Modern admin UI
  - Dark mode
  - Responsive design
  - Chart components (Recharts)
  - Data tables
  - Authentication ready

## Next Steps

### 1. Configure Supabase Connection (5 minutes)
```bash
cd dashboard-app
cp .env.example .env.local
```

Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04
```

### 2. Create Contact Dashboard Page (15 minutes)
Create `dashboard-app/app/contacts/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function ContactsPage() {
  const supabase = createClient()
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, display_name, emails, warmth, warmth_band, created_at')
    .order('warmth', { ascending: false })
    .limit(100)
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Contacts Dashboard</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>Total Contacts</CardHeader>
          <CardContent>{contacts?.length || 0}</CardContent>
        </Card>
        {/* Add more cards for hot/warm/cool/cold */}
      </div>
      
      {/* Contacts Table */}
      <DataTable data={contacts} columns={contactColumns} />
    </div>
  )
}
```

### 3. Deploy to Vercel (5 minutes)
```bash
# In Vercel dashboard:
# 1. New Project
# 2. Import dashboard-app folder
# 3. Add environment variables
# 4. Deploy
# 5. Add custom domain: reports.everreach.app
```

### 4. Add Charts (10 minutes)
Use Recharts (already in template) to add:
- Warmth distribution (pie chart)
- Contact growth over time (line chart)
- Top contacts by warmth (bar chart)

## Estimated Total Time
**35 minutes** to have a working dashboard with real data from Supabase.

## Files to Commit
- ✅ Removed: `evidence-app/` (all Evidence files)
- ✅ Added: `dashboard-app/` (Next.js admin template)
- ✅ Added: `dashboard-app/.env.example` (Supabase config template)

## Deployment Checklist
- [ ] Install dependencies: `cd dashboard-app && npm install`
- [ ] Test locally: `npm run dev`
- [ ] Verify Supabase connection works
- [ ] Create contacts dashboard page
- [ ] Commit changes to git
- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] Configure custom domain
- [ ] Test production deployment

## Lessons Learned
1. **Don't over-engineer**: Sometimes a simpler solution (Next.js) is better than a specialized tool (Evidence)
2. **Test locally first**: We proved Evidence could connect locally, but Vercel environment was different
3. **Know when to pivot**: After 17 hours, switching was the right call
4. **Use proven stacks**: Next.js + Vercel + Supabase = no surprises

## Time Investment
- Evidence debugging: **17 hours**
- Next.js setup: **35 minutes** (estimated)
- **Total savings**: 16+ hours by switching

---

**Status**: Ready to build Next.js dashboard  
**Branch**: feat/evidence-reports (will rename to feat/nextjs-dashboard)  
**Next Action**: Configure Supabase and create contact dashboard page
