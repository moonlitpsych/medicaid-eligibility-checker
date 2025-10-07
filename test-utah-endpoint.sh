#!/bin/bash

# Test the utah-medicaid-working endpoint
echo "🚀 Starting server..."
npm start > /tmp/server-utah-test.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

sleep 4

echo ""
echo "🔍 Testing /api/utah-medicaid/check endpoint..."
curl -X POST http://localhost:3000/api/utah-medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17"}' \
  -s

echo ""
echo ""
echo "🔍 Testing /api/medicaid/check endpoint (main)..."
curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17"}' \
  -s

echo ""
echo ""
echo "📋 Server logs:"
tail -30 /tmp/server-utah-test.log

echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
sleep 1

echo "✅ Test complete!"
