#!/bin/bash

# 🧪 Test Real NFe Download - Chave 35241145070190000232550010006198721341979067

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🧪 Testing Real NFe Download                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Real NFe key (works on website)
CHAVE="35241145070190000232550010006198721341979067"

echo "📋 Test Configuration:"
echo "   NFe Key: $CHAVE"
echo "   Timeout: 180s (3 minutes)"
echo ""

# Check if server is running
echo -e "${BLUE}🔍 Checking if server is running...${NC}"
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Server not running.${NC}"
    echo ""
    echo "Start server with:"
    echo "   npm run start:headless"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test download
echo -e "${BLUE}📥 Starting NFe XML download...${NC}"
echo "   This may take up to 3 minutes (Cloudflare + site processing)"
echo ""

START_TIME=$(date +%s)

RESPONSE=$(timeout 180 curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "download_danfe_xml",
            "arguments": {
                "chave_acesso": "'$CHAVE'"
            }
        }
    }')

EXIT_CODE=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   📊 Test Results                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Duration: ${DURATION}s"
echo ""

if [ $EXIT_CODE -eq 124 ]; then
    echo -e "${RED}❌ Request timed out after 180s${NC}"
    echo ""
    echo "Possible causes:"
    echo "   - Cloudflare challenge taking too long"
    echo "   - Site is slow to respond"
    echo "   - Network issues"
    exit 1
fi

# Parse response
if echo "$RESPONSE" | jq -e '.result' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Download SUCCESSFUL!${NC}"
    echo ""
    
    # Extract file path
    FILE_PATH=$(echo "$RESPONSE" | jq -r '.result.content[0].text' | grep -oP 'downloads/[^"]+\.xml' || echo "")
    
    if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
        FILE_SIZE=$(stat -c%s "$FILE_PATH" 2>/dev/null || stat -f%z "$FILE_PATH" 2>/dev/null)
        echo "📄 File Details:"
        echo "   Path: $FILE_PATH"
        echo "   Size: $FILE_SIZE bytes"
        
        # Validate XML
        if grep -q '<?xml' "$FILE_PATH" && grep -q '<NFe\|<nfeProc' "$FILE_PATH"; then
            echo -e "   ${GREEN}✅ XML validation passed${NC}"
            
            # Show first few lines
            echo ""
            echo "📝 XML Preview (first 5 lines):"
            head -5 "$FILE_PATH"
        else
            echo -e "   ${RED}❌ XML validation failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  File path not found in response${NC}"
    fi
    
    echo ""
    echo "Full Response:"
    echo "$RESPONSE" | jq '.'
    
elif echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}❌ Download FAILED${NC}"
    echo ""
    
    ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code')
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message')
    
    echo "Error Code: $ERROR_CODE"
    echo "Error Message: $ERROR_MSG"
    echo ""
    echo "Full Response:"
    echo "$RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Invalid response${NC}"
    echo ""
    echo "Raw Response:"
    echo "$RESPONSE"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   📝 Summary                                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "NFe Key: $CHAVE"
echo "Duration: ${DURATION}s"
echo "Exit Code: $EXIT_CODE"
echo ""
