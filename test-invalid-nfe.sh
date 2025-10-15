#!/bin/bash

# 🧪 Test Invalid NFe Key - Validate error detection

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🧪 Testing Invalid NFe Key Error Detection             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test with invalid/expired NFe key
INVALID_CHAVE="35240847508411000135550010000109431404849067"

echo "📋 Test Configuration:"
echo "   Invalid Key: $INVALID_CHAVE"
echo "   Expected: Error message about NFe not found"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Server not running. Start with: npm run start:headless${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test download with invalid key
echo "📥 Testing download with invalid/expired NFe key..."
echo "   This should return a descriptive error (not timeout)"
echo ""

START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "download_danfe_xml",
            "arguments": {
                "chave_acesso": "'$INVALID_CHAVE'"
            }
        }
    }')

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Response received in ${DURATION}s:"
echo "$RESPONSE" | jq '.'
echo ""

# Check if error message is descriptive
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message')
    echo "Error message: $ERROR_MSG"
    
    # Check if error is descriptive (not just timeout)
    if echo "$ERROR_MSG" | grep -qi "invalid\|expired\|not found\|not exist"; then
        echo -e "${GREEN}✅ Descriptive error message returned${NC}"
        echo "   The error clearly indicates the NFe issue"
    elif echo "$ERROR_MSG" | grep -qi "timeout"; then
        echo -e "${YELLOW}⚠️  Still returning timeout error${NC}"
        echo "   Expected: 'NFe may be invalid, expired, or not exist'"
    else
        echo -e "${YELLOW}⚠️  Error message could be more descriptive${NC}"
        echo "   Current: $ERROR_MSG"
    fi
else
    echo -e "${RED}❌ Expected error response but got success${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   📊 Test Results                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Expected behavior:"
echo "   ✅ Request completes in <70s (not 120s timeout)"
echo "   ✅ Error message is descriptive"
echo "   ✅ Server doesn't crash"
echo ""
echo "Actual results:"
echo "   Duration: ${DURATION}s"
echo "   Check error message above"
echo ""
