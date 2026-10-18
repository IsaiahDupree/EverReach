// Markdown report builder for automated API tests
import { writeFile } from './http.mjs';

export class Reporter {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl;
    this.startedAt = new Date();
    this.entries = [];
    this.meta = {};
  }
  setMeta(key, value) { this.meta[key] = value; }
  add(entry) { this.entries.push(entry); }
  summary() {
    const total = this.entries.length;
    const passed = this.entries.filter(e => e.ok).length;
    const failed = total - passed;
    return { total, passed, failed };
  }
  toMarkdown() {
    const s = this.summary();
    const lines = [];
    lines.push(`# Automated API Test Report`);
    lines.push('');
    lines.push(`- **Base URL**: ${this.baseUrl}`);
    lines.push(`- **Started**: ${this.startedAt.toISOString()}`);
    lines.push(`- **Finished**: ${new Date().toISOString()}`);
    lines.push(`- **Results**: ${s.passed}/${s.total} passed, ${s.failed} failed`);
    for (const [k,v] of Object.entries(this.meta)) {
      lines.push(`- **${k}**: ${v}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    for (const e of this.entries) {
      lines.push(`## ${e.name}`);
      lines.push('');
      lines.push(`- **Method**: ${e.method}`);
      lines.push(`- **URL**: ${e.url}`);
      lines.push(`- **Status**: ${e.status}`);
      lines.push(`- **OK**: ${e.ok}`);
      if (typeof e.durationMs === 'number') lines.push(`- **Duration**: ${e.durationMs} ms`);
      if (e.error) lines.push(`- **Error**: ${e.error}`);
      if (e.responseExcerpt) {
        lines.push('');
        lines.push('```json');
        lines.push(e.responseExcerpt);
        lines.push('```');
      }
      lines.push('');
    }
    return lines.join('\n');
  }
  async save(filePath) {
    await writeFile(filePath, this.toMarkdown());
    return filePath;
  }
}
