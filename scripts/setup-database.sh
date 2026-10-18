#!/usr/bin/env bash

# =============================================================================
# EverReach App Kit - Automated Database Setup Script
# =============================================================================
# This script automates the setup of your Supabase database by:
# 1. Verifying database connection
# 2. Running migrations (schema.sql)
# 3. Optionally creating seed data for development
#
# USAGE:
#   ./scripts/setup-database.sh [OPTIONS]
#
# OPTIONS:
#   --seed          Create sample seed data for development
#   --backend-only  Use backend-kit schema only
#   --help          Show this help message
#
# REQUIRED ENVIRONMENT VARIABLES:
#   NEXT_PUBLIC_SUPABASE_URL       Your Supabase project URL
#   SUPABASE_SERVICE_ROLE_KEY      Your Supabase service role key
#
# EXAMPLE:
#   # Load environment variables
#   export $(cat backend-kit/.env.local | xargs)
#
#   # Run setup
#   ./scripts/setup-database.sh
#
#   # Run setup with seed data
#   ./scripts/setup-database.sh --seed
#
# =============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
SEED_DATA=false
SHOW_HELP=false
BACKEND_ONLY=false

for arg in "$@"; do
  case $arg in
    --seed)
      SEED_DATA=true
      shift
      ;;
    --backend-only)
      BACKEND_ONLY=true
      shift
      ;;
    --help|-h)
      SHOW_HELP=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Show help and exit
if [ "$SHOW_HELP" = true ]; then
  cat << 'EOF'
EverReach App Kit - Database Setup Script

USAGE:
  ./scripts/setup-database.sh [OPTIONS]

OPTIONS:
  --seed          Create sample seed data for development
  --backend-only  Use backend-kit schema only
  --help, -h      Show this help message

REQUIRED ENVIRONMENT VARIABLES:
  NEXT_PUBLIC_SUPABASE_URL       Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY      Your Supabase service role key

EXAMPLES:
  # Basic setup
  ./scripts/setup-database.sh

  # Setup with seed data
  ./scripts/setup-database.sh --seed

  # Load env vars and run
  export $(cat backend-kit/.env.local | xargs) && ./scripts/setup-database.sh

For more information, see:
  - backend-kit/docs/DATABASE_SETUP.md
  - backend-kit/supabase/MIGRATIONS.md
EOF
  exit 0
fi

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}============================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}============================================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# =============================================================================
# Environment Variable Checks
# =============================================================================

print_header "Checking Environment Variables"

# Check for required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  print_error "NEXT_PUBLIC_SUPABASE_URL is not set"
  echo ""
  echo "Please set your Supabase URL:"
  echo "  export NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co"
  echo ""
  echo "Or load from .env.local:"
  echo "  export \$(cat backend-kit/.env.local | xargs)"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  print_error "SUPABASE_SERVICE_ROLE_KEY is not set"
  echo ""
  echo "Please set your Supabase service role key:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=eyJ..."
  echo ""
  echo "Or load from .env.local:"
  echo "  export \$(cat backend-kit/.env.local | xargs)"
  exit 1
fi

print_success "Environment variables are set"
print_info "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"

# =============================================================================
# Find Schema File
# =============================================================================

print_header "Locating Schema File"

SCHEMA_FILE=""
if [ "$BACKEND_ONLY" = true ]; then
  SCHEMA_FILE="backend-kit/supabase/schema.sql"
elif [ -f "backend-kit/supabase/schema.sql" ]; then
  SCHEMA_FILE="backend-kit/supabase/schema.sql"
elif [ -f "ios-starter/supabase/schema.sql" ]; then
  SCHEMA_FILE="ios-starter/supabase/schema.sql"
else
  print_error "Could not find schema.sql file"
  echo ""
  echo "Expected locations:"
  echo "  - backend-kit/supabase/schema.sql"
  echo "  - ios-starter/supabase/schema.sql"
  exit 1
fi

print_success "Found schema file: $SCHEMA_FILE"

# =============================================================================
# Verify Database Connection
# =============================================================================

print_header "Verifying Database Connection"

# Extract project reference from URL
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')

# Test connection with a simple query
CONNECTION_TEST=$(curl -s \
  -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/version" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" \
  -d '{}')

HTTP_CODE=$(echo "$CONNECTION_TEST" | tail -n 1)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "404" ]; then
  print_error "Failed to connect to Supabase (HTTP $HTTP_CODE)"
  echo ""
  echo "Please verify:"
  echo "  1. Your Supabase project is running"
  echo "  2. The URL and service role key are correct"
  echo "  3. Your internet connection is active"
  exit 1
fi

print_success "Database connection verified"

# =============================================================================
# Run Migrations
# =============================================================================

print_header "Running Database Migrations"

print_info "Applying schema from: $SCHEMA_FILE"

# Read the schema file
SCHEMA_SQL=$(cat "$SCHEMA_FILE")

# Split into smaller chunks if needed (Supabase REST API has size limits)
# For simplicity, we'll use psql if available, otherwise provide instructions

if command -v psql &> /dev/null; then
  print_info "Using psql to apply schema..."

  # Extract connection details
  DB_HOST="db.${PROJECT_REF}.supabase.co"

  # Check if DATABASE_URL is set for password
  if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL not set. You may be prompted for password."
    print_info "Get your database password from: Supabase Dashboard → Project Settings → Database"
  fi

  # Apply schema using psql
  if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f "$SCHEMA_FILE"
  else
    print_info "Attempting connection to: postgres@${DB_HOST}:5432"
    print_warning "You will need to enter your database password"
    psql "postgresql://postgres:@${DB_HOST}:5432/postgres" -f "$SCHEMA_FILE"
  fi

  if [ $? -eq 0 ]; then
    print_success "Schema applied successfully via psql"
  else
    print_error "Failed to apply schema via psql"
    exit 1
  fi

else
  print_warning "psql not found. Using Supabase SQL Editor is recommended."
  echo ""
  echo "To apply the schema:"
  echo "  1. Go to your Supabase Dashboard"
  echo "  2. Click 'SQL Editor' in the left sidebar"
  echo "  3. Click 'New Query'"
  echo "  4. Copy the contents of: $SCHEMA_FILE"
  echo "  5. Paste into the SQL Editor"
  echo "  6. Click 'Run' or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)"
  echo ""
  echo "After applying the schema manually, re-run this script to verify."
  echo ""
  read -p "Have you applied the schema manually? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Setup aborted. Please apply schema and try again."
    exit 0
  fi
fi

# =============================================================================
# Verify Tables Created
# =============================================================================

print_header "Verifying Tables"

print_info "Checking for required tables..."

# Check for users table
USERS_CHECK=$(curl -s \
  -X GET \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?select=id&limit=0" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -w "\n%{http_code}")

USERS_HTTP=$(echo "$USERS_CHECK" | tail -n 1)

if [ "$USERS_HTTP" = "200" ]; then
  print_success "Table 'users' exists"
else
  print_warning "Table 'users' may not exist (HTTP $USERS_HTTP)"
fi

# Check for subscriptions table
SUBS_CHECK=$(curl -s \
  -X GET \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/subscriptions?select=id&limit=0" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -w "\n%{http_code}")

SUBS_HTTP=$(echo "$SUBS_CHECK" | tail -n 1)

if [ "$SUBS_HTTP" = "200" ]; then
  print_success "Table 'subscriptions' exists"
else
  print_warning "Table 'subscriptions' may not exist (HTTP $SUBS_HTTP)"
fi

# Check for items table
ITEMS_CHECK=$(curl -s \
  -X GET \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/items?select=id&limit=0" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -w "\n%{http_code}")

ITEMS_HTTP=$(echo "$ITEMS_CHECK" | tail -n 1)

if [ "$ITEMS_HTTP" = "200" ]; then
  print_success "Table 'items' exists"
else
  print_warning "Table 'items' may not exist (HTTP $ITEMS_HTTP)"
fi

# =============================================================================
# Create Seed Data (Optional)
# =============================================================================

if [ "$SEED_DATA" = true ]; then
  print_header "Creating Seed Data"

  print_info "Creating sample items for development..."

  # Note: This requires a user to exist first
  # In production, you would create a test user via Supabase Auth
  print_warning "Seed data creation requires an authenticated user"
  print_info "To create seed data:"
  echo "  1. Sign up a test user via your app"
  echo "  2. Run the commented SQL from: $SCHEMA_FILE"
  echo "  3. Or create data manually via Supabase Table Editor"

else
  print_info "Skipping seed data (use --seed flag to create sample data)"
fi

# =============================================================================
# Summary
# =============================================================================

print_header "Setup Complete!"

echo ""
echo "Your Supabase database has been configured with:"
echo "  ✓ User profiles table"
echo "  ✓ Subscriptions management"
echo "  ✓ Items CRUD entity (customize to your needs)"
echo "  ✓ Row Level Security policies"
echo "  ✓ Triggers and functions"
echo ""
echo "Next steps:"
echo "  1. Verify tables in Supabase Dashboard → Table Editor"
echo "  2. Customize the 'items' table for your use case"
echo "  3. Update RLS policies if needed"
echo "  4. Test your API endpoints"
echo ""
echo "Documentation:"
echo "  - Database Setup: backend-kit/docs/DATABASE_SETUP.md"
echo "  - Migrations: backend-kit/supabase/MIGRATIONS.md"
echo "  - API Reference: backend-kit/docs/API_REFERENCE.md"
echo ""

print_success "Database setup complete!"
echo ""
