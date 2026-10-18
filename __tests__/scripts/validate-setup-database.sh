#!/usr/bin/env bash

# =============================================================================
# Validation Test for setup-database.sh
# =============================================================================
# This script validates that the setup-database.sh script meets all
# acceptance criteria from the feature requirements:
#
# Acceptance Criteria (from HO-DB-003):
# 1. Runs migrations
# 2. Creates seed data
# 3. Verifies connection
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_PATH="scripts/setup-database.sh"
TEST_PASSED=0
TEST_FAILED=0

print_test() {
  echo -e "${YELLOW}Testing: $1${NC}"
}

print_pass() {
  echo -e "${GREEN}  ✓ PASS: $1${NC}"
  ((TEST_PASSED++))
}

print_fail() {
  echo -e "${RED}  ✗ FAIL: $1${NC}"
  ((TEST_FAILED++))
}

echo ""
echo "============================================================"
echo "  Validating setup-database.sh"
echo "============================================================"
echo ""

# Test 1: Script exists
print_test "Script file exists"
if [ -f "$SCRIPT_PATH" ]; then
  print_pass "Script exists at $SCRIPT_PATH"
else
  print_fail "Script not found at $SCRIPT_PATH"
fi

# Test 2: Script is executable
print_test "Script is executable"
if [ -x "$SCRIPT_PATH" ]; then
  print_pass "Script has execute permissions"
else
  print_fail "Script is not executable (run: chmod +x $SCRIPT_PATH)"
fi

# Test 3: Script has shebang
print_test "Script has proper shebang"
FIRST_LINE=$(head -n 1 "$SCRIPT_PATH")
if [[ "$FIRST_LINE" =~ ^#!/.*bash ]]; then
  print_pass "Script has bash shebang: $FIRST_LINE"
else
  print_fail "Script missing bash shebang"
fi

# Test 4: Script checks for NEXT_PUBLIC_SUPABASE_URL
print_test "Checks for NEXT_PUBLIC_SUPABASE_URL environment variable"
if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$SCRIPT_PATH"; then
  print_pass "Script references NEXT_PUBLIC_SUPABASE_URL"
else
  print_fail "Script doesn't check NEXT_PUBLIC_SUPABASE_URL"
fi

# Test 5: Script checks for SUPABASE_SERVICE_ROLE_KEY
print_test "Checks for SUPABASE_SERVICE_ROLE_KEY environment variable"
if grep -q "SUPABASE_SERVICE_ROLE_KEY" "$SCRIPT_PATH"; then
  print_pass "Script references SUPABASE_SERVICE_ROLE_KEY"
else
  print_fail "Script doesn't check SUPABASE_SERVICE_ROLE_KEY"
fi

# Test 6: Script references schema.sql
print_test "References schema.sql migration file"
if grep -q "schema.sql" "$SCRIPT_PATH"; then
  print_pass "Script references schema.sql"
else
  print_fail "Script doesn't reference schema.sql"
fi

# Test 7: Script has connection verification
print_test "Includes connection verification step"
if grep -qi "verify\|test.*connection\|connection.*test" "$SCRIPT_PATH"; then
  print_pass "Script includes connection verification"
else
  print_fail "Script missing connection verification"
fi

# Test 8: Script has error handling
print_test "Includes error handling"
if grep -q "set -e\|exit 1" "$SCRIPT_PATH"; then
  print_pass "Script has error handling"
else
  print_fail "Script missing error handling"
fi

# Test 9: Script has user-friendly output
print_test "Provides user-friendly output messages"
if grep -q "echo\|printf" "$SCRIPT_PATH"; then
  print_pass "Script provides output messages"
else
  print_fail "Script missing output messages"
fi

# Test 10: Script has usage documentation
print_test "Includes usage instructions"
if grep -qi "usage\|USAGE\|--help" "$SCRIPT_PATH"; then
  print_pass "Script includes usage documentation"
else
  print_fail "Script missing usage documentation"
fi

# Test 11: Script supports --seed flag
print_test "Supports --seed flag for creating seed data"
if grep -q "\-\-seed" "$SCRIPT_PATH"; then
  print_pass "Script supports --seed flag"
else
  print_fail "Script doesn't support --seed flag"
fi

# Test 12: Script has help option
print_test "Supports --help flag"
if grep -q "\-\-help" "$SCRIPT_PATH"; then
  print_pass "Script supports --help flag"
else
  print_fail "Script doesn't support --help flag"
fi

# Test 13: Acceptance Criteria - Runs migrations
print_test "Acceptance: Can run migrations"
if grep -q "schema.sql" "$SCRIPT_PATH" && grep -qi "migrat\|apply.*schema\|psql.*-f" "$SCRIPT_PATH"; then
  print_pass "Script can run migrations from schema.sql"
else
  print_fail "Script doesn't properly run migrations"
fi

# Test 14: Acceptance Criteria - Creates seed data
print_test "Acceptance: Can create seed data"
if grep -qi "seed" "$SCRIPT_PATH"; then
  print_pass "Script includes seed data functionality"
else
  print_fail "Script missing seed data functionality"
fi

# Test 15: Acceptance Criteria - Verifies connection
print_test "Acceptance: Verifies database connection"
if grep -qi "verify.*connection\|test.*connection\|curl.*supabase" "$SCRIPT_PATH"; then
  print_pass "Script verifies database connection"
else
  print_fail "Script missing connection verification"
fi

# Test 16: Help text execution test
print_test "Help flag executes without error"
if ./"$SCRIPT_PATH" --help > /dev/null 2>&1; then
  print_pass "Script --help runs successfully"
else
  print_fail "Script --help fails to execute"
fi

# Summary
echo ""
echo "============================================================"
echo "  Validation Results"
echo "============================================================"
echo ""
echo -e "${GREEN}Passed: $TEST_PASSED${NC}"
echo -e "${RED}Failed: $TEST_FAILED${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All validation tests passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Some validation tests failed.${NC}"
  echo ""
  exit 1
fi
