#!/bin/bash

# Build script for Render native deployment
# Este script instala as dependências do Playwright para ambiente Linux

echo "🔧 Installing system dependencies for Playwright..."

# Install system dependencies for Playwright on Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libgtk-3-0 \
  libgtk-4-1 \
  libgbm1 \
  libasound2 \
  xvfb

echo "📦 Installing Node.js dependencies..."
npm ci

echo "🎭 Installing Playwright browsers..."
npx playwright install chromium
npx playwright install-deps chromium

echo "🏗️ Building TypeScript..."
npm run build

echo "✅ Build completed successfully!"