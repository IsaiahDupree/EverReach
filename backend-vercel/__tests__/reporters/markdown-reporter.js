const fs = require('fs');
const path = require('path');

class MarkdownReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig || {};
    this._options = options || {};
  }

  onRunComplete(contexts, results) {
    try {
      const root = this._globalConfig.rootDir || process.cwd();
      const dirFromEnv = process.env.JEST_MD_REPORT_DIR && process.env.JEST_MD_REPORT_DIR.trim();
      const reportDir = dirFromEnv
        ? path.isAbsolute(dirFromEnv) ? dirFromEnv : path.join(root, dirFromEnv)
        : path.join(root, '__tests__', 'reports');
      fs.mkdirSync(reportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportDir, `jest-report-${timestamp}.md`);

      const lines = [];
      lines.push('# Test Report');
      lines.push('');
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push('');

      // Summary
      lines.push('## Summary');
      lines.push('');
      lines.push(`- Total tests: ${results.numTotalTests}`);
      lines.push(`- Passed: ${results.numPassedTests}`);
      lines.push(`- Failed: ${results.numFailedTests}`);
      lines.push(`- Skipped: ${results.numPendingTests}`);
      lines.push(`- Test suites: ${results.numTotalTestSuites} (passed ${results.numPassedTestSuites}, failed ${results.numFailedTestSuites})`);
      lines.push('');

      // ANSI stripper (to clean Jest colored output)
      const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
      const stripAnsi = (str) => typeof str === 'string' ? str.replace(ANSI_REGEX, '') : str;

      // Suites
      if (Array.isArray(results.testResults)) {
        lines.push('## Suites');
        lines.push('');
        for (const suite of results.testResults) {
          const rel = path.relative(root, suite.testFilePath || '');
          lines.push(`### ${rel}`);
          lines.push('');
          lines.push(`- Status: ${suite.numFailingTests ? '❌ FAIL' : '✅ PASS'} (passed ${suite.numPassingTests}, failed ${suite.numFailingTests}, skipped ${suite.numPendingTests})`);

          if (suite.failureMessage) {
            const raw = suite.failureMessage;
            const cleaned = stripAnsi(raw);
            const msg = cleaned.length > 2000 ? cleaned.slice(0, 2000) + '...' : cleaned;
            lines.push('');
            lines.push('Failure message:');
            lines.push('```');
            lines.push(msg);
            lines.push('```');
          }

          if (Array.isArray(suite.testResults) && suite.testResults.length) {
            lines.push('');
            lines.push('| Test | Status | Duration (ms) |');
            lines.push('|------|--------|---------------|');
            for (const t of suite.testResults) {
              const statusIcon = t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : '⏭️';
              const name = (t.fullName || t.title || '').replace(/\|/g, '\\|');
              lines.push(`| ${name} | ${statusIcon} | ${t.duration ?? ''} |`);
              if (t.status === 'failed' && Array.isArray(t.failureMessages) && t.failureMessages.length) {
                const fm = stripAnsi(t.failureMessages.join('\n\n'));
                const trimmed = fm.length > 1500 ? fm.slice(0, 1500) + '...' : fm;
                lines.push('');
                lines.push('Failure details:');
                lines.push('```');
                lines.push(trimmed);
                lines.push('```');
              }
            }
          }
          lines.push('');
        }
      }

      fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
      console.log(`📄 Jest markdown report saved: ${path.relative(process.cwd(), reportPath)}`);
    } catch (e) {
      console.warn('⚠️ Failed to write markdown report:', e?.message || e);
    }
  }
}

module.exports = MarkdownReporter;
