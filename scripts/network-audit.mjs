#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = process.env.WEB_BASE_URL || 'http://localhost:8081';
const EMAIL = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
const PASS = process.env.TEST_PASSWORD || '';

const PAGES = [
  '/',
  '/people',
  '/chat',
  '/settings',
  '/notifications',
  '/mode-settings',
  '/subscription-plans',
  '/message-templates',
  '/personal-notes',
  '/health-status',
  '/message-results',
];

function ts() { return new Date().toISOString().replace(/[:.]/g, '-'); }

function normalizePath(p) {
  if (!p) return '';
  const noQuery = p.split('?')[0];
  return noQuery.replace(/\/+/g, '/');
}

function extractPathFromEventMethodPath(methodPath) {
  // methodPath looks like: "GET /api/v1/contacts?limit=1000"
  if (!methodPath) return '';
  const parts = methodPath.trim().split(/\s+/);
  const pathPart = parts.length >= 2 ? parts[1] : parts[0];
  return normalizePath(pathPart);
}

async function ensureHealthLoaded(page) {
  await page.goto(`${BASE}/health-status`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

async function clearAudit(page) {
  await ensureHealthLoaded(page);
  // try testID, then fallback to text
  const clearByTestId = page.locator('[data-testid="audit-clear"]');
  if (await clearByTestId.count()) {
    await clearByTestId.first().click().catch(() => {});
    return;
  }
  const clearByText = page.getByText('Clear');
  if (await clearByText.count()) {
    await clearByText.first().click().catch(() => {});
  }
}

async function readAudit(page, { errorsOnly = true } = {}) {
  await ensureHealthLoaded(page);
  // Toggle errors filter if available
  const toggle = page.locator('[data-testid="audit-toggle-errors"], :text("Errors Only"), :text("Show All")').first();
  if (await toggle.count()) {
    // Click twice to normalize state and then set to desired
    await toggle.click().catch(() => {});
    await toggle.click().catch(() => {});
    if (!errorsOnly) {
      await toggle.click().catch(() => {});
    }
  }
  const rows = page.locator('[data-testid^="audit-row-"]');
  const count = await rows.count().catch(() => 0);
  const events = [];
  for (let i = 0; i < count; i++) {
    const text = (await rows.nth(i).innerText()).trim();
    // Expect something like: "GET /api/xyz"  "200"  "123ms"
    // We'll extract last tokens
    const parts = text.split('\n').map(s => s.trim()).filter(Boolean);
    // parts might be ["METHOD PATH", "STATUS", "123ms"]
    let methodPath = parts[0] || text;
    let statusRaw = parts[1] || '';
    let durationRaw = parts[2] || '';
    const status = parseInt((statusRaw || '').replace(/[^0-9-]/g, ''), 10);
    const durationMs = parseInt((durationRaw || '').replace(/[^0-9]/g, ''), 10);
    events.push({ methodPath, status: isNaN(status) ? null : status, durationMs: isNaN(durationMs) ? null : durationMs });
  }
  return events;
}

async function navigateAndCapture(page, route) {
  await clearAudit(page); // isolate per-page events
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  const events = await readAudit(page, { errorsOnly: false });
  return events;
}

async function interactiveFlow(page) {
  const snapshots = [];
  // Try People -> first interaction candidates
  try {
    await clearAudit(page);
    await page.goto(`${BASE}/people`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    // Click anything that looks like a contact item or opens detail
    const candidate = page.locator('a, button, [role="button"]').first();
    if (await candidate.count()) {
      await candidate.click().catch(() => {});
      await page.waitForTimeout(1000);
      const ev1 = await readAudit(page, { errorsOnly: false });
      snapshots.push({ route: '/people :: open-first', events: ev1 });
    }
    // Try History tab
    const history = page.getByText(/history/i).first();
    if (await history.count()) {
      await history.click().catch(() => {});
      await page.waitForTimeout(1000);
      const ev2 = await readAudit(page, { errorsOnly: false });
      snapshots.push({ route: '/people :: history-tab', events: ev2 });
    }
  } catch {}

  // Try Craft -> Goal Picker -> Generate -> Message Results
  try {
    await clearAudit(page);
    // Buttons likely live on detail or chat pages; try root
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    console.log('[flow] At root. URL=', page.url());
    // Deterministic flow using testIDs
    // 1) Go to People and open first contact
    await page.goto(`${BASE}/people`, { waitUntil: 'networkidle' });
    console.log('[flow] At /people. URL=', page.url());
    const firstContact = page.locator('[data-testid="contact-item"]').first();
    console.log('[flow] contact-item count=', await firstContact.count());
    if (await firstContact.count()) {
      await firstContact.scrollIntoViewIfNeeded().catch(() => {});
      await firstContact.click().catch(() => {});
      // Wait for contact detail route
      try { await page.waitForURL('**/contact/**', { timeout: 3000 }); } catch {}
      // Give the screen time to render detail elements
      try { await page.waitForSelector('[data-testid="craftMessageButton"], [data-testid="noteInput"]', { timeout: 4000 }); } catch {}
      console.log('[flow] After clicking contact. URL=', page.url());
      // Extract contact id from URL now for forced navigation later
      let forcedCid = null;
      try {
        const url = new URL(page.url());
        const m = url.pathname.match(/\/contact(?:-context)?\/([^/?#]+)/);
        forcedCid = m && m[1] ? m[1] : null;
        console.log('[flow] Extracted contact id =', forcedCid);
      } catch {}
      await page.waitForTimeout(1000);
      const evA = await readAudit(page, { errorsOnly: false });
      snapshots.push({ route: '/people :: open-first (testID)', events: evA });
      // Force navigate to contact-context even if tile not present
      if (forcedCid) {
        try {
          await page.goto(`${BASE}/contact-context/${forcedCid}`, { waitUntil: 'networkidle' });
          console.log('[flow] Forced goto contact-context for id', forcedCid, 'URL=', page.url());
          await page.waitForTimeout(1000);
        } catch (e) {
          console.log('[flow] Forced goto contact-context failed:', e?.message || e);
        }
      }
    }

    // 1b) Add a note on Contact Detail if possible
    try {
      try { await page.waitForSelector('[data-testid="noteInput"]', { timeout: 4000 }); } catch {}
      const noteInput = page.locator('[data-testid="noteInput"]').first();
      const addBtn = page.locator('[data-testid="addNoteButton"]').first();
      console.log('[flow] noteInput count=', await noteInput.count(), 'addNoteButton count=', await addBtn.count());
      if (await noteInput.count() && await addBtn.count()) {
        await noteInput.scrollIntoViewIfNeeded().catch(() => {});
        await noteInput.fill(`Automated audit note ${Date.now()}`);
        await addBtn.click().catch(() => {});
        await page.waitForTimeout(1200);
        const evNote = await readAudit(page, { errorsOnly: false });
        snapshots.push({ route: '/contact-detail :: add-note', events: evNote });
      }
    } catch {}

    // 1c) Change pipeline theme and stage if available
    try {
      try { await page.waitForSelector('[data-testid^="theme-"]', { timeout: 4000 }); } catch {}
      const anyTheme = page.locator('[data-testid^="theme-"]').first();
      console.log('[flow] theme-* count=', await anyTheme.count());
      if (await anyTheme.count()) {
        await anyTheme.scrollIntoViewIfNeeded().catch(() => {});
        await anyTheme.click().catch(() => {});
        await page.waitForTimeout(800);
        const evTheme = await readAudit(page, { errorsOnly: false });
        snapshots.push({ route: '/contact-detail :: change-theme', events: evTheme });
      }
      try { await page.waitForSelector('[data-testid^="status-"]', { timeout: 4000 }); } catch {}
      const anyStage = page.locator('[data-testid^="status-"]').first();
      console.log('[flow] status-* count=', await anyStage.count());
      if (await anyStage.count()) {
        await anyStage.scrollIntoViewIfNeeded().catch(() => {});
        await anyStage.click().catch(() => {});
        await page.waitForTimeout(800);
        const evStage = await readAudit(page, { errorsOnly: false });
        snapshots.push({ route: '/contact-detail :: change-stage', events: evStage });
      }
    } catch {}

    // 1d) Open Contact Context and History tab
    try {
      let navigatedToContext = false;
      try { await page.waitForSelector('[data-testid="contextSummaryTile"]', { timeout: 3000 }); } catch {}
      const contextTile = page.locator('[data-testid="contextSummaryTile"]').first();
      console.log('[flow] contextSummaryTile count=', await contextTile.count());
      if (await contextTile.count()) {
        await contextTile.scrollIntoViewIfNeeded().catch(() => {});
        await contextTile.click().catch(() => {});
        navigatedToContext = true;
      } else {
        // Fallback: derive contact id from URL and navigate directly
        try {
          const url = new URL(page.url());
          const m = url.pathname.match(/\/contact\/([^/?#]+)/);
          const cid = m && m[1] ? m[1] : null;
          if (cid) {
            await page.goto(`${BASE}/contact-context/${cid}`, { waitUntil: 'networkidle' });
            navigatedToContext = true;
          }
        } catch {}
      }
      if (navigatedToContext) {
        await page.waitForTimeout(1000);
        try { await page.waitForSelector('[data-testid="tab-interactions"]', { timeout: 4000 }); } catch {}
        const tabHistory = page.locator('[data-testid="tab-interactions"]').first();
        console.log('[flow] tab-interactions count=', await tabHistory.count());
        if (await tabHistory.count()) {
          await tabHistory.click().catch(() => {});
          await page.waitForTimeout(1000);
        }
        const evHist = await readAudit(page, { errorsOnly: false });
        snapshots.push({ route: '/contact-context :: history-tab (testID)', events: evHist });
      }
    } catch {}

    // 1e) Direct API exercise fallback (if UI elements not present)
    try {
      const url = new URL(page.url());
      const m =
        url.pathname.match(/\/contact(?:-context)?\/([^/?#]+)/) ||
        url.search.match(/personId=([^&]+)/);
      const cid = (m && m[1]) ? m[1] : null;
      if (cid) {
        console.log('[flow] Direct API exercise for cid=', cid);
        await page.evaluate(async (contactId) => {
          const headers = { 'Content-Type': 'application/json' };

          // Pipelines (context)
          try { await fetch(`/api/v1/pipelines`, { credentials: 'include' }); } catch {}

          // Notes POST
          try {
            await fetch(`/api/v1/contacts/${contactId}/notes`, {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({ content: `Audit note at ${new Date().toISOString()}` }),
            });
          } catch {}

          // History GET
          try { await fetch(`/api/v1/contacts/${contactId}/history`, { credentials: 'include' }); } catch {}

          // Pipeline POST (best-effort)
          try {
            await fetch(`/api/v1/contacts/${contactId}/pipeline`, {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({ pipeline_key: 'networking' }),
            });
          } catch {}

          // Pipeline move POST (best-effort; stage id placeholder)
          try {
            await fetch(`/api/v1/contacts/${contactId}/pipeline/move`, {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({ stage_id: 'stage_initial' }),
            });
          } catch {}
        }, cid);

        await page.waitForTimeout(1200);
        const evApi = await readAudit(page, { errorsOnly: false });
        snapshots.push({ route: '/contact-detail :: api-fallback', events: evApi });
      }
    } catch (e) {
      console.log('[flow] Direct API exercise error:', e?.message || e);
    }

    // 2) Craft Message button on Contact Detail
    let wentToGoalPicker = false;
    try { await page.waitForSelector('[data-testid="craftMessageButton"], [data-testid="craftMessageButtonSticky"]', { timeout: 4000 }); } catch {}
    const craftBtn = page.locator('[data-testid="craftMessageButton"], [data-testid="craftMessageButtonSticky"]').first();
    console.log('[flow] craftMessageButton count=', await craftBtn.count());
    if (await craftBtn.count()) {
      await craftBtn.scrollIntoViewIfNeeded().catch(() => {});
      await craftBtn.click().catch(() => {});
      wentToGoalPicker = true;
      await page.waitForTimeout(1000);
      const evB = await readAudit(page, { errorsOnly: false });
      snapshots.push({ route: '/contact-detail :: craft', events: evB });
    } else {
      // Fallback: navigate directly using contact id
      try {
        const url = new URL(page.url());
        const m = url.pathname.match(/\/contact(?:-context)?\/([^/?#]+)/);
        const cid = m && m[1] ? m[1] : null;
        if (cid) {
          await page.goto(`${BASE}/goal-picker?personId=${cid}&channel=sms`, { waitUntil: 'networkidle' });
          wentToGoalPicker = true;
          console.log('[flow] Forced goto goal-picker for id', cid, 'URL=', page.url());
        }
      } catch {}
    }

    // 3) Goal Picker: set custom goal and click Generate
    if (wentToGoalPicker) {
      try { await page.waitForSelector('[data-testid="customGoalInput"]', { timeout: 4000 }); } catch {}
      const customGoal = page.locator('[data-testid="customGoalInput"]').first();
      console.log('[flow] customGoalInput count=', await customGoal.count());
      if (await customGoal.count()) {
        await customGoal.scrollIntoViewIfNeeded().catch(() => {});
        await customGoal.fill('Follow up on our last chat');
      }
      // Try also selecting a suggested goal if present
      try { await page.waitForSelector('[data-testid^="goal_"]', { timeout: 4000 }); } catch {}
      const anyGoal = page.locator('[data-testid^="goal_"]').first();
      console.log('[flow] goal_* count=', await anyGoal.count());
      if (await anyGoal.count()) {
        await anyGoal.scrollIntoViewIfNeeded().catch(() => {});
        await anyGoal.click().catch(() => {});
      }
      try { await page.waitForSelector('[data-testid="generateButton"]', { timeout: 4000 }); } catch {}
      const gen = page.locator('[data-testid="generateButton"]').first();
      console.log('[flow] generateButton count=', await gen.count());
      if (await gen.count()) {
        await gen.scrollIntoViewIfNeeded().catch(() => {});
        await gen.click().catch(() => {});
        // Wait for Message Results screen root testID if possible
        try { await page.waitForSelector('[data-testid="messageResultsRoot"]', { timeout: 4000 }); } catch {}
        console.log('[flow] After generate, URL=', page.url());
        await page.waitForTimeout(1200);
      }
    }

    // 4) Message Results explicit visit and capture
    const evmr = await navigateAndCapture(page, '/message-results');
    snapshots.push({ route: '/message-results :: explicit', events: evmr });
  } catch {}

  return snapshots;
}

function toMarkdownReport(results) {
  const lines = [];
  lines.push(`# Network Audit Report`);
  lines.push(`Base URL: ${BASE}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  let total = 0;
  let totalErrors = 0;
  for (const r of results) {
    const errCount = r.events.filter(e => e.status !== null && e.status >= 400).length;
    total += r.events.length;
    totalErrors += errCount;
    lines.push(`## ${r.route}`);
    lines.push(`- Events: ${r.events.length}`);
    lines.push(`- Errors: ${errCount}`);
    lines.push('');
    if (r.events.length) {
      lines.push('| Status | Duration | Request |');
      lines.push('|---:|---:|---|');
      for (const e of r.events) {
        const s = e.status === null ? '' : String(e.status);
        const d = e.durationMs === null ? '' : `${e.durationMs}ms`;
        const req = e.methodPath.replace(/\|/g, '/');
        lines.push(`| ${s} | ${d} | ${req} |`);
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push(`Total events: ${total}`);
  lines.push(`Total errors: ${totalErrors}`);
  return lines.join('\n');
}

function buildCoverageSection(masterPaths, results) {
  const captured = new Set();
  for (const r of results) {
    for (const e of r.events) {
      const p = extractPathFromEventMethodPath(e.methodPath);
      if (p) captured.add(p);
    }
  }
  const master = new Set(masterPaths.map(normalizePath));
  const hit = [];
  const missed = [];
  for (const m of master) {
    if (captured.has(m)) hit.push(m); else missed.push(m);
  }
  const extra = [];
  for (const c of captured) {
    if (!master.has(c)) extra.push(c);
  }
  const lines = [];
  lines.push('');
  lines.push('## Coverage vs Master Endpoints');
  lines.push(`- Master endpoints: ${master.size}`);
  lines.push(`- Captured unique endpoints: ${captured.size}`);
  lines.push(`- Covered: ${hit.length}`);
  lines.push(`- Missed: ${missed.length}`);
  lines.push('');
  if (missed.length) {
    lines.push('### Missed (not hit)');
    for (const m of missed.sort()) lines.push(`- ${m}`);
    lines.push('');
  }
  if (extra.length) {
    lines.push('### Captured but not in master');
    for (const c of extra.sort()) lines.push(`- ${c}`);
    lines.push('');
  }
  return { section: lines.join('\n'), stats: { master: master.size, captured: captured.size, hit: hit.length, missed: missed.length, extra: extra.length } };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log(`[audit] Starting network audit. Base=${BASE}`);

  // Optional: sign-in flow on web if needed
  if (PASS) {
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      // Heuristic: if a sign-in form exists, fill it
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]').first();
      const passInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name*="password" i]').first();
      if (await emailInput.count() && await passInput.count()) {
        await emailInput.fill(EMAIL);
        await passInput.fill(PASS);
        const signInButton = page.locator('button, [role="button"]').filter({ hasText: /sign in/i }).first();
        if (await signInButton.count()) {
          await signInButton.click().catch(() => {});
          await page.waitForTimeout(2000);
        }
      }
    } catch {}
  }

  const results = [];
  for (const route of PAGES) {
    const events = await navigateAndCapture(page, route);
    const errCount = events.filter(e => e.status !== null && e.status >= 400).length;
    console.log(`[audit] ${route}: ${events.length} events, ${errCount} errors`);
    results.push({ route, events });
  }

  // Interactive flows (best-effort)
  const flows = await interactiveFlow(page);
  for (const r of flows) {
    const errCount = r.events.filter(e => e.status !== null && e.status >= 400).length;
    console.log(`[audit] ${r.route}: ${r.events.length} events, ${errCount} errors`);
    results.push(r);
  }

  // Load master endpoints from OpenAPI if present
  let masterPaths = [];
  try {
    const openapiPath = path.join(__dirname, '..', 'backend-vercel', 'openapi', 'openapi.json');
    const raw = fs.readFileSync(openapiPath, 'utf8');
    const spec = JSON.parse(raw);
    masterPaths = Object.keys(spec.paths || {});
    // Ensure health/version are included if not in spec root
    if (!masterPaths.includes('/api/health')) masterPaths.push('/api/health');
    if (!masterPaths.includes('/api/version')) masterPaths.push('/api/version');
  } catch {}

  // Merge additional master endpoints from docs/ALL_ENDPOINTS_MASTER_LIST.md
  try {
    const mdPath = path.join(__dirname, '..', 'docs', 'ALL_ENDPOINTS_MASTER_LIST.md');
    const mdRaw = fs.readFileSync(mdPath, 'utf8');
    const regex = /`(?:GET|POST|PATCH|PUT|DELETE)\s+([^`\s]+)`/g;
    let m;
    while ((m = regex.exec(mdRaw)) !== null) {
      let p = m[1];
      // Normalize to /api/v1 prefix when doc uses /v1
      if (p.startsWith('/v1/')) p = '/api' + p;
      // Some doc lines use bracket params; strip those to base path
      p = p.replace(/\[.*?\]/g, '');
      masterPaths.push(p);
    }
  } catch {}

  // Whitelist endpoints not part of master (telemetry, tracking, etc.)
  const whitelist = new Set(['/api/telemetry/events', '/api/tracking/events']);
  // Filter out whitelisted extras by adding them to master
  masterPaths.push(...Array.from(whitelist));

  const { section: coverageSection, stats } = buildCoverageSection(masterPaths, results);
  console.log(`[audit] Coverage: master=${stats.master}, captured=${stats.captured}, hit=${stats.hit}, missed=${stats.missed}, extra=${stats.extra}`);

  const md = toMarkdownReport(results) + '\n' + coverageSection;
  const outDir = path.join(__dirname, '..', 'test-reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `network-audit-${ts()}.md`);
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`[audit] Report written: ${outPath}`);

  await browser.close();
})();
