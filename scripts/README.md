# Scripts Directory

Utility scripts for development, maintenance, and DevOps tasks.

## Available Scripts

### 🔍 audit-endpoints.js

**Purpose:** Audits API endpoints to find used, unused, and missing endpoints.

**Usage:**
```bash
npm run audit:endpoints
```

**Output:**
- ✓ GREEN: Used endpoints (backend + frontend)
- ⚠ YELLOW: Unused endpoints (backend only)
- ✗ RED: Missing endpoints (frontend only)

**Documentation:**
- Full Guide: `/docs/ENDPOINT_AUDIT_GUIDE.md`
- Quick Reference: `/docs/ENDPOINT_AUDIT_QUICK_REF.md`

**When to Run:**
- Monthly maintenance
- Before major releases
- After removing features
- When cleaning up tech debt

---

## Adding New Scripts

### Template

```javascript
#!/usr/bin/env node

/**
 * Script Name
 * 
 * Brief description of what it does
 * 
 * Usage: node scripts/your-script.js [options]
 */

// Your code here

if (require.main === module) {
  // CLI execution
  try {
    main();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

module.exports = { main };
```

### Checklist

- [ ] Add shebang: `#!/usr/bin/env node`
- [ ] Add docstring with usage
- [ ] Export functions for testing
- [ ] Add error handling
- [ ] Update package.json scripts
- [ ] Write documentation
- [ ] Add to this README

---

## Guidelines

1. **Use Node.js** - Scripts should be runnable with `node`
2. **No external dependencies** - Use built-in modules when possible
3. **Clear output** - Use colors and formatting
4. **Error handling** - Always catch and report errors
5. **Documentation** - Write docs in `/docs` folder
6. **Testing** - Make functions exportable for tests

---

## Common Patterns

### File System Operations
```javascript
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname);
```

### CLI Colors
```javascript
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

console.log(`${colors.green}✓ Success${colors.reset}`);
```

### Progress Reporting
```javascript
console.log('Scanning backend endpoints...');
// ... work ...
console.log(`✓ Found ${count} endpoints\n`);
```

---

## Future Scripts Ideas

- [ ] **generate-api-docs.js** - Auto-generate API documentation
- [ ] **check-env.js** - Validate environment variables
- [ ] **db-seed.js** - Seed database with test data
- [ ] **analyze-bundle.js** - Analyze bundle size
- [ ] **find-unused-deps.js** - Find unused npm packages
- [ ] **check-breaking-changes.js** - Detect breaking API changes
- [ ] **generate-types.js** - Generate TypeScript types from API
