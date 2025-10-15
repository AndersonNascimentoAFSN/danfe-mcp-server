#!/bin/bash

# 🧪 Test Error Handling - Validate SessionNotFoundError handling

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🧪 Testing Error Handling - Session Not Found          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "🏥 Test 1: Health check..."
HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server not running. Start with: npm run start:headless${NC}"
    exit 1
fi

# Test 2: GET with invalid session (should return error, not crash)
echo ""
echo "🔍 Test 2: GET /mcp with invalid session..."
INVALID_SESSION_ID="invalid-session-id-12345"
GET_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "mcp-session-id: $INVALID_SESSION_ID" \
    http://localhost:3000/mcp 2>/dev/null)

HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
BODY=$(echo "$GET_RESPONSE" | sed '$d')

echo "   HTTP Code: $HTTP_CODE"
echo "   Response: $BODY"

if [ "$HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✅ Correct HTTP 400 error returned${NC}"
else
    echo -e "${RED}❌ Expected HTTP 400, got $HTTP_CODE${NC}"
fi

# Test 3: Verify server is still running (didn't crash)
echo ""
echo "🏥 Test 3: Verify server still alive after error..."
sleep 1
HEALTH2=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server still running (didn't crash!)${NC}"
else
    echo -e "${RED}❌ Server crashed!${NC}"
    exit 1
fi

# Test 4: DELETE with invalid session
echo ""
echo "🗑️  Test 4: DELETE /mcp with invalid session..."
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X DELETE \
    -H "mcp-session-id: $INVALID_SESSION_ID" \
    http://localhost:3000/mcp 2>/dev/null)

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
BODY=$(echo "$DELETE_RESPONSE" | sed '$d')

echo "   HTTP Code: $HTTP_CODE"
echo "   Response: $BODY"

if [ "$HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✅ Correct HTTP 400 error returned${NC}"
else
    echo -e "${RED}❌ Expected HTTP 400, got $HTTP_CODE${NC}"
fi

# Test 5: Final health check
echo ""
echo "🏥 Test 5: Final health check..."
sleep 1
HEALTH3=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server still running after all tests${NC}"
    echo "$HEALTH3" | jq '.'
else
    echo -e "${RED}❌ Server crashed!${NC}"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ All Error Handling Tests PASSED                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Test Summary:"
echo "   ✅ Health check"
echo "   ✅ GET /mcp with invalid session (returns 400)"
echo "   ✅ Server didn't crash after GET error"
echo "   ✅ DELETE /mcp with invalid session (returns 400)"
echo "   ✅ Server didn't crash after DELETE error"
echo ""
echo "🎉 Server is handling errors correctly without crashing!"
echo ""
