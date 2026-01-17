const fs = require('fs');
const path = require('path');

const V1_ROOT = path.join(__dirname, '..', 'backend-vercel', 'app', 'api', 'v1');
const OUTPUT = path.join(__dirname, '..', 'test', 'PLANS', 'ENDPOINT_UI_COVERAGE.md');

function toRouteSegment(seg) {
  // Convert [id] to :id, [trpc] to :trpc
  if (/^\[.*\]$/.test(seg)) return `:${seg.slice(1, -1)}`;
  return seg;
}

function derivePath(filePath) {
  const parts = filePath.split(path.sep);
  const idx = parts.lastIndexOf('v1');
  const routeParts = parts.slice(idx + 1, parts.length - 1); // drop route.ts
  const segs = routeParts.map(toRouteSegment);
  return '/v1/' + segs.join('/');
}

function readMethods(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const methods = [];
  const re = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)/g;
  let m;
  while ((m = re.exec(src)) !== null) methods.push(m[1]);
  // OPTIONS often handled; not an API method clients call directly
  return Array.from(new Set(methods)).sort();
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name === 'route.ts') out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(V1_ROOT)) {
    console.error('[ERROR] v1 API root not found:', V1_ROOT);
    process.exit(1);
  }
  const files = walk(V1_ROOT);
  const endpoints = files.map(f => ({ path: derivePath(f), methods: readMethods(f), file: f }));
  endpoints.sort((a, b) => a.path.localeCompare(b.path));

  // Group by top-level resource
  const groups = new Map();
  for (const ep of endpoints) {
    const top = ep.path.split('/')[2] || 'misc';
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(ep);
  }

  let md = '# Backend v1 Endpoint → UI Coverage\n\n';
  md += `**Generated**: ${new Date().toISOString()}  \n`;
  md += `**Source**: ${path.relative(process.cwd(), V1_ROOT)}  \n`;
  md += `**Count**: ${endpoints.length} endpoints (route.ts files)  \n\n`;

  md += '## Summary by Resource\n\n';
  md += '| Resource | Endpoints | Example UI | Status |\n|---|---:|---|---|\n';
  for (const [res, eps] of Array.from(groups.entries()).sort()) {
    md += `| ${res} | ${eps.length} |  |  |\n`;
  }
  md += '\n';

  for (const [res, eps] of Array.from(groups.entries()).sort()) {
    md += `## ${res}\n\n`;
    md += '| Method | Path | UI Link | Notes |\n|---|---|---|---|\n';
    for (const ep of eps) {
      const methods = ep.methods.join(', ');
      md += `| ${methods} | \`${ep.path}\` |  |  |\n`;
    }
    md += '\n';
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, md, 'utf8');
  console.log('[OK] Wrote endpoint coverage to', OUTPUT);
}

main();
