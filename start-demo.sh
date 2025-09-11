#!/bin/bash

echo "🎯 Starting Recovery Day Demo System..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if reach-2-0 directory exists
if [ ! -d "../reach-2-0" ]; then
    echo "❌ Error: ../reach-2-0 directory not found"
    echo "Please ensure the reach-2-0 patient app is in the parent directory"
    exit 1
fi

echo "🚀 Starting both servers..."
echo "   - CPSS Interface: http://localhost:3000"
echo "   - Patient App: http://localhost:3002"
echo "   - Demo Page: http://localhost:3000/test-complete-patient-flow.html"
echo ""
echo "Press Ctrl+C to stop all servers"

# Start both servers concurrently
npm run demo-dev