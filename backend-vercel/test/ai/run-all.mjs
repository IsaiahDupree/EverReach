/**
 * AI Feature Tests Runner
 * 
 * Runs all AI Goal Inference tests and generates unified report
 */

import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const REPORTS_DIR = 'test/ai/reports';

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
      process.stdout.write(data);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
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

async function generateUnifiedReport(results) {
  await mkdir(REPORTS_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `${REPORTS_DIR}/ai_tests_unified_${timestamp}.md`;

  const totalTests = results.length;
  const passed = results.filter(r => r.code === 0).length;
  const failed = results.filter(r => r.code !== 0).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const lines = [
    '# AI Goal Inference Tests - Unified Report',
    '',
    `**Generated**: ${new Date().toISOString()}`,
    `**Backend**: ${process.env.BACKEND_BASE || 'https://ever-reach-be.vercel.app'}`,
    '',
    '## Summary',
    '',
    `- **Total Tests**: ${totalTests}`,
    `- **Passed**: ✅ ${passed}`,
    `- **Failed**: ❌ ${failed}`,
    `- **Success Rate**: ${totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0}%`,
    `- **Total Duration**: ${formatDuration(totalDuration)}`,
    '',
    '## Test Results',
    '',
    '| Test | Status | Duration |',
    '|------|--------|----------|',
  ];

  for (const result of results) {
    const testName = result.file.replace('test/ai/', '').replace('.mjs', '');
    const status = result.code === 0 ? '✅ PASS' : '❌ FAIL';
    const duration = formatDuration(result.duration);
    lines.push(`| ${testName} | ${status} | ${duration} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Test Coverage');
  lines.push('');
  lines.push('- ✅ **Explicit Goals**: Profile field extraction and storage');
  lines.push('- ✅ **E2E Workflow**: Complete goal inference → AI context → message generation');
  lines.push('- ✅ **Performance**: Profile updates < 200ms, message composition < 2000ms');
  lines.push('');

  if (failed > 0) {
    lines.push('## ⚠️ Failed Tests');
    lines.push('');
    results.filter(r => r.code !== 0).forEach(r => {
      const testName = r.file.replace('test/ai/', '').replace('.mjs', '');
      lines.push(`### ❌ ${testName}`);
      lines.push('');
      lines.push(`- **Duration**: ${formatDuration(r.duration)}`);
      lines.push(`- **Exit Code**: ${r.code}`);
      if (r.stderr) {
        lines.push('');
        lines.push('**Error Output:**');
        lines.push('```');
        lines.push(r.stderr.trim().slice(-500)); // Last 500 chars
        lines.push('```');
      }
      lines.push('');
    });
  }

  await writeFile(reportPath, lines.join('\n'), 'utf8');
  console.log(`\n📊 Unified report generated: ${reportPath}`);
  
  return reportPath;
}

async function main() {
  const dir = 'test/ai';
  const entries = await readdir(dir, { withFileTypes: true });
  const testFiles = entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(n => n.endsWith('.mjs') && n !== 'run-all.mjs' && !n.startsWith('_'));

  if (testFiles.length === 0) {
    console.log('[ai-tests] No tests found in', dir);
    return;
  }

  console.log(`\n🧪 Running ${testFiles.length} AI feature tests...\n`);

  const results = [];
  
  for (const name of testFiles) {
    const filePath = join(dir, name);
    console.log(`\n[${results.length + 1}/${testFiles.length}] Running ${name}...`);
    const result = await runOne(filePath);
    results.push(result);
    
    const status = result.code === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} in ${formatDuration(result.duration)}`);
  }

  const reportPath = await generateUnifiedReport(results);

  const passed = results.filter(r => r.code === 0).length;
  const failed = results.filter(r => r.code !== 0).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n' + '='.repeat(60));
  console.log('📊 AI TESTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests:    ${results.length}`);
  console.log(`Passed:         ✅ ${passed}`);
  console.log(`Failed:         ❌ ${failed}`);
  console.log(`Success Rate:   ${results.length > 0 ? ((passed / results.length) * 100).toFixed(1) : 0}%`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Some tests failed. See report for details:');
    console.log(`   ${reportPath}`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${results.length} tests passed!`);
    console.log(`📄 Full report: ${reportPath}`);
  }
}

main().catch((err) => {
  console.error('[ai-tests] Runner error:', err?.message || err);
  process.exit(1);
});
