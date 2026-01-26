#!/bin/bash

echo "============================================"
echo "DIARIO MERCANTIL - Health Check"
echo "============================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

tests_passed=0
tests_failed=0

# Test 1: Database Connection
echo -n "Test 1: Database Connection... "
if docker exec diario-mercantil-backend-1 php -r "require '/var/www/html/src/Database.php'; Database::pdo(); echo 'OK';" 2>/dev/null | grep -q "OK"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((tests_passed++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((tests_failed++))
fi

# Test 2: Superadmin Exists
echo -n "Test 2: Superadmin Exists... "
if docker exec diario-mercantil-db-1 mysql -u root -proot_secure_password_2025 diario_mercantil -sN -e "SELECT COUNT(*) FROM superadmins WHERE username='merchandev';" 2>/dev/null | grep -q "1"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((tests_passed++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((tests_failed++))
fi

# Test 3: Superadmin Password Hash Valid
echo -n "Test 3: Superadmin Password Valid... "
result=$(docker exec diario-mercantil-backend-1 php -r "
require '/var/www/html/src/Database.php';
\$pdo = Database::pdo();
\$hash = \$pdo->query(\"SELECT password_hash FROM superadmins WHERE username='merchandev'\")->fetchColumn();
echo password_verify('G0ku*1896', \$hash) ? 'VALID' : 'INVALID';
" 2>/dev/null)

if echo "$result" | grep -q "VALID"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((tests_passed++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((tests_failed++))
fi

# Test 4: Users Table Populated
echo -n "Test 4: Users Table Populated... "
count=$(docker exec diario-mercantil-db-1 mysql -u root -proot_secure_password_2025 diario_mercantil -sN -e "SELECT COUNT(*) FROM users;" 2>/dev/null)
if [ "$count" -ge "2" ]; then
    echo -e "${GREEN}✓ PASSED${NC} ($count users)"
    ((tests_passed++))
else
    echo -e "${RED}✗ FAILED${NC} (only $count users)"
    ((tests_failed++))
fi

# Test 5: Frontend Accessible
echo -n "Test 5: Frontend Accessible... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((tests_passed++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((tests_failed++))
fi

# Test 6: Backend API Accessible
echo -n "Test 6: Backend API Accessible... "
if curl -s http://localhost/api/settings | grep -q "{"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((tests_passed++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((tests_failed++))
fi

echo ""
echo "============================================"
echo "Results:"
echo -e "${GREEN}Passed: $tests_passed${NC}"
echo -e "${RED}Failed: $tests_failed${NC}"
echo "============================================"

if [ $tests_failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
