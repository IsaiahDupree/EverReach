/**
 * Unified Backend Test Runner
 * 
 * Runs all backend E2E tests and generates a single comprehensive report with:
 * - Test status (pass/fail)
 * - Error logs
 * - Performance metrics
 * - Summary statistics
 */

import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const REPORTS_DIR = 'test/backend/reports';
const UNIFIED_REPORT_PREFIX = 'unified_backend_test_report';

function runOne(file) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    const proc = spawn(process.execPath, [file], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data); // Still show live output
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data); // Still show live errors
    });

    proc.on('exit', (code) => {
      const duration = Date.now() - startTime;
      resolve({ file, code, duration, stdout, stderr });
    });
  });
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function extractTestName(filePath) {
  return filePath.replace('test/backend/', '').replace('.mjs', '');
}

async function readTestReport(testName) {
  const prefix = testName.split('/').pop();
  const normalized = prefix.replace(/-/g, '_');
  const runTag = process.env.TEST_RUN_ID ? `_run-${process.env.TEST_RUN_ID}` : '';
  try {
    const files = await readdir(REPORTS_DIR);
    const matching = files
      .filter(f => f.startsWith(`${normalized}${runTag}_`) || (!runTag && f.startsWith(`${normalized}_`)))
      .sort()
      .reverse();
    const reportFile = matching[0] || files.filter(f => f.startsWith(`${normalized}_`)).sort().reverse()[0];
    if (!reportFile) return null;
    const content = await readFile(join(REPORTS_DIR, reportFile), 'utf8');
    return content;
  } catch (e) {
    return null;
  }
}

async function generateUnifiedReport(results) {
  await mkdir(REPORTS_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runTag = process.env.TEST_RUN_ID ? `_run-${process.env.TEST_RUN_ID}` : '';
  const reportPath = `${REPORTS_DIR}/${UNIFIED_REPORT_PREFIX}${runTag}_${timestamp}.md`;

  const totalTests = results.length;
  const passed = results.filter(r => r.code === 0).length;
  const failed = results.filter(r => r.code !== 0).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const lines = [
    '# Unified Backend Test Report',
    '',
    `**Generated**: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Total Tests**: ${totalTests}`,
    `- **Passed**: ✅ ${passed}`,
    `- **Failed**: ❌ ${failed}`,
    `- **Success Rate**: ${totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0}%`,
    `- **Total Duration**: ${formatDuration(totalDuration)}`,
    '',
    '## Test Results Summary',
    '',
    '| Test | Status | Duration | Exit Code |',
    '|------|--------|----------|-----------|',
  ];

  // Sort: failed first, then by duration
  const sortedResults = [...results].sort((a, b) => {
    if (a.code !== 0 && b.code === 0) return -1;
    if (a.code === 0 && b.code !== 0) return 1;
    return b.duration - a.duration;
  });

  for (const result of sortedResults) {
    const testName = extractTestName(result.file);
    const status = result.code === 0 ? '✅ PASS' : '❌ FAIL';
    const duration = formatDuration(result.duration);
    lines.push(`| ${testName} | ${status} | ${duration} | ${result.code} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Detailed Test Reports');
  lines.push('');

  for (const result of sortedResults) {
    const testName = extractTestName(result.file);
    const report = await readTestReport(testName);
    
    if (report) {
      const reportLines = report.split('\n');
      const titleIndex = reportLines.findIndex(line => line.startsWith('# '));
      
      lines.push(`### ${result.code === 0 ? '✅' : '❌'} ${testName}`);
      lines.push('');
      
      if (titleIndex >= 0 && reportLines.length > titleIndex + 1) {
        const content = reportLines.slice(titleIndex + 1).join('\n').trim();
        lines.push(content);
      } else {
        lines.push(`*Report content not available*`);
      }
    } else {
      lines.push(`### ${result.code === 0 ? '✅' : '❌'} ${testName}`);
      lines.push('');
      lines.push(`- **Duration**: ${formatDuration(result.duration)}`);
      lines.push(`- **Exit Code**: ${result.code}`);
      
      if (result.stderr && result.stderr.trim()) {
        lines.push('');
        lines.push('**Error Output:**');
        lines.push('```');
        lines.push(result.stderr.trim());
        lines.push('```');
      }
    }
    
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('');
  lines.push('## Environment');
  lines.push('');
  lines.push(`- **API Base**: ${process.env.API_BASE || 'https://ever-reach-be.vercel.app'}`);
  lines.push(`- **Node**: ${process.version}`);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Test Coverage');
  lines.push('');
  lines.push('This unified report covers:');
  lines.push('- ✅ RevenueCat subscription webhooks');
  lines.push('- ✅ File CRUD operations (audio/images)');
  lines.push('- ✅ Authentication and authorization');
  lines.push('- ✅ API error handling');
  lines.push('');

  if (failed > 0) {
    lines.push('## ⚠️ Failed Tests Require Attention');
    lines.push('');
    lines.push('Please review the error logs above for failed tests.');
    lines.push('Common issues:');
    lines.push('- Expired JWT tokens');
    lines.push('- Missing environment variables');
    lines.push('- API endpoint changes');
    lines.push('- Network timeouts');
    lines.push('');
  }

  await writeFile(reportPath, lines.join('\n'), 'utf8');
  console.log(`\n📊 Unified report generated: ${reportPath}`);
  
  return reportPath;
}

async function main() {
  // Ensure a consistent RUN ID
  if (!process.env.TEST_RUN_ID) {
    process.env.TEST_RUN_ID = Math.random().toString(36).slice(2, 10);
  }

  const dir = 'test/backend';
  const entries = await readdir(dir, { withFileTypes: true });
  const testFiles = entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(n => n.endsWith('.mjs') && n !== 'run-all.mjs' && !n.startsWith('_'));

  if (testFiles.length === 0) {
    console.log('[backend-tests] No tests found in', dir);
    return;
  }

  console.log(`\n🧪 Running ${testFiles.length} backend tests...\n`);

  const results = [];
  
  for (const name of testFiles) {
    const filePath = join(dir, name);
    console.log(`\n[${results.length + 1}/${testFiles.length}] Running ${extractTestName(filePath)}...`);
    const result = await runOne(filePath);
    results.push(result);
    
    const status = result.code === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} in ${formatDuration(result.duration)}`);
  }

  // Generate unified report
  const reportPath = await generateUnifiedReport(results);

  // Print summary
  const passed = results.filter(r => r.code === 0).length;
  const failed = results.filter(r => r.code !== 0).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n' + '='.repeat(60));
  console.log('📊 BACKEND TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests:    ${results.length}`);
  console.log(`Passed:         ✅ ${passed}`);
  console.log(`Failed:         ❌ ${failed}`);
  console.log(`Success Rate:   ${results.length > 0 ? ((passed / results.length) * 100).toFixed(1) : 0}%`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => r.code !== 0).forEach(r => {
      console.log(`   - ${extractTestName(r.file)} (exit ${r.code})`);
    });
    console.log(`\n📄 See detailed error logs in: ${reportPath}`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${results.length} tests passed!`);
    console.log(`📄 Full report: ${reportPath}`);
  }
}

main().catch((err) => {
  console.error('[backend-tests] Runner error:', err?.message || err);
  process.exit(1);
});
