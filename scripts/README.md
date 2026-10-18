# EverReach App Kit - Scripts

This directory contains automated setup and utility scripts for the EverReach App Kit.

## Available Scripts

### setup-database.sh

Automated database setup script that configures your Supabase database.

**What it does:**
1. Verifies database connection
2. Runs migrations (schema.sql)
3. Optionally creates seed data for development

**Usage:**
```bash
# Show help
./scripts/setup-database.sh --help

# Basic setup (load env vars first)
export $(cat backend-kit/.env.local | xargs)
./scripts/setup-database.sh

# Setup with seed data
./scripts/setup-database.sh --seed

# Use backend-kit schema only
./scripts/setup-database.sh --backend-only
```

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DATABASE_URL` (optional) - Direct database connection string for psql

**Prerequisites:**
- `curl` (for API calls)
- `psql` (optional, but recommended for applying schema)

**Documentation:**
- [Database Setup Guide](../backend-kit/docs/DATABASE_SETUP.md)
- [Migrations Guide](../backend-kit/supabase/MIGRATIONS.md)

---

## Adding New Scripts

When adding new scripts to this directory:

1. **Use bash shebang:** `#!/usr/bin/env bash`
2. **Make executable:** `chmod +x scripts/your-script.sh`
3. **Add error handling:** Use `set -e` at the top
4. **Include help text:** Support `--help` flag
5. **Document here:** Add description to this README
6. **Write tests:** Create validation tests in `__tests__/scripts/`

### Script Template

```bash
#!/usr/bin/env bash
set -e

# Usage information
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  cat << EOF
Script Name - Brief Description

USAGE:
  ./scripts/your-script.sh [OPTIONS]

OPTIONS:
  --option    Description
  --help      Show this help

EXAMPLE:
  ./scripts/your-script.sh --option
EOF
  exit 0
fi

# Your script logic here
```

---

## Testing Scripts

Test scripts are located in `__tests__/scripts/` and can be run to validate functionality:

```bash
# Run validation tests
./__tests__/scripts/validate-setup-database.sh
```

---

## Support

For issues with scripts:
1. Check the script's `--help` output
2. Review the relevant documentation linked above
3. Check environment variables are properly set
4. Open an issue on GitHub with the error output
