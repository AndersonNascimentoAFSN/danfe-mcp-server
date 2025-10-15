#!/bin/bash

# 🧪 Quick Test Script - DANFE Downloader MCP Server v2.0.0
# Tests the bug fix for Playwright adapter timeout

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🧪 Testing DANFE Downloader - Bug Fix Validation       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMEOUT=120
CHAVE_TESTE="35240847508411000135550010000109431404849067"

echo "📋 Test Configuration:"
echo "   Timeout: ${TEST_TIMEOUT}s"
echo "   Test Key: ${CHAVE_TESTE}"
echo ""

# Step 1: Check if server is already running
echo "🔍 Step 1: Checking if server is already running..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server already running on port 3000${NC}"
    echo "   Skipping server start..."
else
    echo -e "${GREEN}✅ Port 3000 is available${NC}"
    
    # Step 2: Start server
    echo ""
    echo "🚀 Step 2: Starting server..."
    npm run start:headless > /tmp/mcp-server.log 2>&1 &
    SERVER_PID=$!
    echo "   PID: $SERVER_PID"
    
    # Wait for server to be ready
    echo "   Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Server ready after ${i}s${NC}"
            break
        fi
        sleep 1
    done
fi

# Step 3: Health check
echo ""
echo "🏥 Step 3: Health check..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "$HEALTH_RESPONSE" | jq '.'
if echo "$HEALTH_RESPONSE" | jq -e '.status == "healthy"' > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

# Step 4: Test MCP tools endpoint
echo ""
echo "🔧 Step 4: Testing MCP tools endpoint..."
TOOLS_RESPONSE=$(curl -s http://localhost:3000/mcp/tools)
if echo "$TOOLS_RESPONSE" | jq -e '.tools[0].name == "download_danfe_xml"' > /dev/null; then
    echo -e "${GREEN}✅ Tools endpoint working${NC}"
    echo "   Tool: download_danfe_xml"
else
    echo -e "${RED}❌ Tools endpoint failed${NC}"
    exit 1
fi

# Step 5: Create session and test download
echo ""
echo "📥 Step 5: Testing download with real NFe key..."
echo "   Key: ${CHAVE_TESTE}"
echo "   This will test the bug fix (correct CSS selectors)"
echo ""

# Create session
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "download_danfe_xml",
            "arguments": {
                "chave_acesso": "'$CHAVE_TESTE'"
            }
        }
    }')

echo "Response:"
echo "$SESSION_RESPONSE" | jq '.'

# Check for success
if echo "$SESSION_RESPONSE" | jq -e '.result' > /dev/null 2>&1; then
    FILE_PATH=$(echo "$SESSION_RESPONSE" | jq -r '.result.content[0].text' | grep -oP 'downloads/[^"]+\.xml' || echo "")
    if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
        echo -e "${GREEN}✅ Download successful!${NC}"
        echo "   File: $FILE_PATH"
        echo "   Size: $(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH") bytes"
        
        # Validate XML
        if grep -q '<?xml' "$FILE_PATH" && grep -q '<NFe\|<nfeProc' "$FILE_PATH"; then
            echo -e "${GREEN}✅ XML validation passed${NC}"
        else
            echo -e "${RED}❌ XML validation failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Download completed but file not found${NC}"
    fi
else
    ERROR_MSG=$(echo "$SESSION_RESPONSE" | jq -r '.error.message' 2>/dev/null || echo "Unknown error")
    echo -e "${RED}❌ Download failed: $ERROR_MSG${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ Test Complete                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Test Results Summary:"
echo "   ✅ Health Check"
echo "   ✅ Tools Endpoint"
echo "   Check download result above"
echo ""
echo "📝 Server logs: /tmp/mcp-server.log"
echo "📁 Downloads folder: $(pwd)/downloads/"
echo ""
