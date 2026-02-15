/**
 * Warmth Read-Only Audit Tests
 * 
 * These tests verify that the iOS frontend NEVER writes warmth-related
 * fields (warmth, amplitude, warmth_band) to the backend. The frontend
 * should only READ warmth from the backend and display it.
 * 
 * Warmth is computed server-side by the EWMA model:
 *   warmth = 30 + amplitude × e^(-λ × daysSinceUpdate)
 * 
 * The only legitimate warmth writes are:
 *   1. Backend interaction endpoints (updateAmplitudeForContact)
 *   2. Backend recompute endpoint (computeWarmthFromAmplitude)
 *   3. Backend daily-warmth cron
 */

import * as fs from 'fs';
import * as path from 'path';

// Directories to audit for warmth writes
const APP_DIR = path.resolve(__dirname, '../app');
const PROVIDERS_DIR = path.resolve(__dirname, '../providers');
const HOOKS_DIR = path.resolve(__dirname, '../hooks');
const LIB_DIR = path.resolve(__dirname, '../lib');
const FEATURES_DIR = path.resolve(__dirname, '../features');
const REPOS_DIR = path.resolve(__dirname, '../repos');

// Patterns that indicate a warmth WRITE (not a read)
const WARMTH_WRITE_PATTERNS = [
  // Direct Supabase writes
  /\.update\(\{[^}]*warmth\s*:/,
  /\.insert\(\{[^}]*warmth\s*:/,
  /\.upsert\(\{[^}]*warmth\s*:/,
  // Payload construction that includes warmth
  /updatePayload\.warmth\s*=/,
  /payload\.warmth\s*=/,
  // Direct amplitude writes from frontend
  /\.update\(\{[^}]*amplitude\s*:/,
  /\.insert\(\{[^}]*amplitude\s*:/,
];

// Files/patterns that are ALLOWED to reference warmth writes
const ALLOWED_PATTERNS = [
  // Test files themselves
  /warmth-readonly-audit\.test\.ts/,
  // Comments about not writing warmth
  /\/\/.*[Nn]ever write warmth/,
  /\/\/.*warmth.*server-side/,
  /\/\/.*warmth.*computed/,
  /\/\/.*NOTE:.*warmth/,
];

function getAllTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  
  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'backend-vercel') continue;
        walk(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return results;
}

function findWarmthWrites(filePath: string): { line: number; content: string; pattern: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: { line: number; content: string; pattern: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if line is a comment
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    
    // Skip if line matches allowed patterns
    if (ALLOWED_PATTERNS.some(p => p.test(line))) continue;

    for (const pattern of WARMTH_WRITE_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          line: i + 1,
          content: line.trim(),
          pattern: pattern.source,
        });
      }
    }
  }

  return violations;
}

describe('Warmth Read-Only Audit', () => {
  const dirsToAudit = [APP_DIR, PROVIDERS_DIR, HOOKS_DIR, LIB_DIR, FEATURES_DIR, REPOS_DIR];
  
  let allFiles: string[] = [];
  
  beforeAll(() => {
    allFiles = dirsToAudit.flatMap(dir => getAllTsFiles(dir));
  });

  test('should find frontend source files to audit', () => {
    expect(allFiles.length).toBeGreaterThan(0);
    console.log(`Auditing ${allFiles.length} frontend files for warmth writes`);
  });

  test('no frontend file should write warmth to Supabase or API payload', () => {
    const allViolations: { file: string; violations: { line: number; content: string; pattern: string }[] }[] = [];

    for (const file of allFiles) {
      const violations = findWarmthWrites(file);
      if (violations.length > 0) {
        const relPath = path.relative(path.resolve(__dirname, '..'), file);
        allViolations.push({ file: relPath, violations });
      }
    }

    if (allViolations.length > 0) {
      const report = allViolations.map(v => {
        const details = v.violations.map(viol => `  Line ${viol.line}: ${viol.content}`).join('\n');
        return `${v.file}:\n${details}`;
      }).join('\n\n');
      
      console.error('WARMTH WRITE VIOLATIONS FOUND:\n' + report);
    }

    expect(allViolations).toEqual([]);
  });

  test('WarmthProvider.refreshWarmth should only call backend recompute (not write directly)', () => {
    const warmthProviderPath = path.resolve(PROVIDERS_DIR, 'WarmthProvider.tsx');
    if (!fs.existsSync(warmthProviderPath)) {
      console.warn('WarmthProvider.tsx not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(warmthProviderPath, 'utf-8');
    
    // Should call the recompute API endpoint
    expect(content).toContain('/warmth/recompute');
    
    // Should NOT directly write warmth to Supabase
    expect(content).not.toMatch(/supabase.*\.from\(['"]contacts['"]\).*\.update\(\{[^}]*warmth\s*:/s);
  });

  test('WarmthProvider default score should be 30 (EWMA BASE)', () => {
    const warmthProviderPath = path.resolve(PROVIDERS_DIR, 'WarmthProvider.tsx');
    if (!fs.existsSync(warmthProviderPath)) {
      console.warn('WarmthProvider.tsx not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(warmthProviderPath, 'utf-8');
    
    // Should NOT default to 50
    expect(content).not.toMatch(/warmth\s*\?\?\s*50/);
    
    // Should default to 30 (BASE)
    expect(content).toMatch(/warmth\s*\?\?\s*30/);
  });

  test('contact detail page should not include warmth in PATCH payload', () => {
    const contactDetailPath = path.resolve(APP_DIR, 'contact/[id].tsx');
    if (!fs.existsSync(contactDetailPath)) {
      console.warn('contact/[id].tsx not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(contactDetailPath, 'utf-8');
    
    // Should NOT have warmth fallback write
    expect(content).not.toMatch(/updatePayload\.warmth\s*=\s*contact\.warmth/);
    
    // Should have the "never write warmth" guard
    expect(content).toContain('Never write warmth');
  });

  test('add-contact page should not set warmth on creation', () => {
    const addContactPath = path.resolve(APP_DIR, 'add-contact.tsx');
    if (!fs.existsSync(addContactPath)) {
      console.warn('add-contact.tsx not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(addContactPath, 'utf-8');
    const lines = content.split('\n');
    
    // Check that no line sets warmth in the creation payload
    const warmthAssignments = lines.filter(line => {
      if (line.trim().startsWith('//')) return false;
      return /warmth\s*[:=]\s*\d+/.test(line) && !/warmth_mode/.test(line);
    });
    
    // warmth_mode is allowed (user can set decay speed)
    // but warmth score itself should not be set
    expect(warmthAssignments).toEqual([]);
  });

  test('SupabaseContactsRepo should default warmth to 30 (not 50)', () => {
    const repoPath = path.resolve(__dirname, '../repos/SupabaseContactsRepo.ts');
    if (!fs.existsSync(repoPath)) {
      console.warn('SupabaseContactsRepo.ts not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(repoPath, 'utf-8');
    
    // Should NOT default to 50
    expect(content).not.toMatch(/warmth.*\?\?\s*50/);
    
    // Should default to 30 (BASE)
    expect(content).toMatch(/warmth.*\?\?\s*30/);
  });

  test('onboarding should not write warmth_score (stale column name)', () => {
    const onboardingPath = path.resolve(APP_DIR, 'onboarding-v2.tsx');
    if (!fs.existsSync(onboardingPath)) {
      console.warn('onboarding-v2.tsx not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(onboardingPath, 'utf-8');
    
    // Should NOT use the old column name
    expect(content).not.toContain('warmth_score');
    
    // Should set amplitude=0 and warmth_band on contact creation
    expect(content).toContain('amplitude: 0');
    expect(content).toContain("warmth_band: 'cool'");
  });

  test('no file in the codebase defaults warmth to 50', () => {
    const allDirs = [APP_DIR, PROVIDERS_DIR, HOOKS_DIR, LIB_DIR, FEATURES_DIR, REPOS_DIR];
    const files = allDirs.flatMap(dir => getAllTsFiles(dir));
    
    const violations: { file: string; line: number; content: string }[] = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
        if (/warmth\s*\?\?\s*50/.test(line)) {
          violations.push({
            file: path.relative(path.resolve(__dirname, '..'), file),
            line: i + 1,
            content: line.trim(),
          });
        }
      }
    }
    
    if (violations.length > 0) {
      console.error('WARMTH DEFAULT 50 VIOLATIONS:', violations);
    }
    expect(violations).toEqual([]);
  });

  test('no frontend file uses old warmth band thresholds (70/50/15)', () => {
    const allDirs = [APP_DIR, PROVIDERS_DIR, HOOKS_DIR, LIB_DIR, FEATURES_DIR, REPOS_DIR,
      path.resolve(__dirname, '../components')];
    const files = allDirs.flatMap(dir => getAllTsFiles(dir));
    
    // Old thresholds that should NOT appear in warmth band logic
    const OLD_PATTERNS = [
      /warmth\s*>=\s*70\s*\?\s*['"]hot['"]/,
      /warmth\s*>=\s*50\s*\?\s*['"]warm['"]/,
      /warmth\s*>=\s*15\s*\?\s*['"]cool['"]/,
    ];
    
    const violations: { file: string; line: number; content: string }[] = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
        for (const pattern of OLD_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(path.resolve(__dirname, '..'), file),
              line: i + 1,
              content: line.trim(),
            });
          }
        }
      }
    }
    
    if (violations.length > 0) {
      console.error('OLD WARMTH THRESHOLD VIOLATIONS:', violations);
    }
    expect(violations).toEqual([]);
  });
});

describe('EWMA Formula Consistency (ios-app/backend-vercel)', () => {
  test('warmth-ewma.ts lambda values match production backend', () => {
    const ewmaPath = path.resolve(__dirname, '../backend-vercel/lib/warmth-ewma.ts');
    if (!fs.existsSync(ewmaPath)) {
      console.warn('backend-vercel/lib/warmth-ewma.ts not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(ewmaPath, 'utf-8');
    
    // Production lambda values
    expect(content).toContain('0.040132');  // slow
    expect(content).toContain('0.085998');  // medium
    expect(content).toContain('0.171996');  // fast
    
    // Should NOT have old wrong values
    expect(content).not.toMatch(/slow:\s*0\.01\b/);
    expect(content).not.toMatch(/medium:\s*0\.03\b/);
    expect(content).not.toMatch(/fast:\s*0\.06\b/);
  });

  test('warmth-ewma.ts exports computeWarmthFromAmplitude', () => {
    const ewmaPath = path.resolve(__dirname, '../backend-vercel/lib/warmth-ewma.ts');
    if (!fs.existsSync(ewmaPath)) {
      console.warn('backend-vercel/lib/warmth-ewma.ts not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(ewmaPath, 'utf-8');
    expect(content).toContain('export function computeWarmthFromAmplitude');
  });

  test('warmth-ewma.ts exports updateAmplitudeForContact', () => {
    const ewmaPath = path.resolve(__dirname, '../backend-vercel/lib/warmth-ewma.ts');
    if (!fs.existsSync(ewmaPath)) {
      console.warn('backend-vercel/lib/warmth-ewma.ts not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(ewmaPath, 'utf-8');
    expect(content).toContain('export async function updateAmplitudeForContact');
  });

  test('recompute route uses EWMA (not old heuristic)', () => {
    const recomputePath = path.resolve(
      __dirname,
      '../backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts'
    );
    if (!fs.existsSync(recomputePath)) {
      console.warn('recompute route not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(recomputePath, 'utf-8');
    
    // Should import from warmth-ewma
    expect(content).toContain('warmth-ewma');
    expect(content).toContain('computeWarmthFromAmplitude');
    
    // Should NOT have old heuristic patterns
    expect(content).not.toContain('WARMTH_INTERACTION_KINDS');
    expect(content).not.toContain('recencyBoost');
    expect(content).not.toContain('freqBoost');
    expect(content).not.toContain('channelBonus');
    expect(content).not.toMatch(/warmth\s*=\s*40/);  // old base was 40
  });

  test('warmth band thresholds are consistent (80/60/40/20)', () => {
    const ewmaPath = path.resolve(__dirname, '../backend-vercel/lib/warmth-ewma.ts');
    if (!fs.existsSync(ewmaPath)) {
      console.warn('backend-vercel/lib/warmth-ewma.ts not found — skipping');
      return;
    }
    
    const content = fs.readFileSync(ewmaPath, 'utf-8');
    
    // Check getWarmthBand function has correct thresholds
    expect(content).toMatch(/score >= 80.*'hot'/);
    expect(content).toMatch(/score >= 60.*'warm'/);
    expect(content).toMatch(/score >= 40.*'neutral'/);
    expect(content).toMatch(/score >= 20.*'cool'/);
    
    // Should NOT have old thresholds (70/50/30/15)
    expect(content).not.toMatch(/score >= 70.*'hot'/);
    expect(content).not.toMatch(/score >= 50.*'warm'/);
    expect(content).not.toMatch(/score >= 15.*'cool'/);
  });
});
