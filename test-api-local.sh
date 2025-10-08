#!/bin/bash

# Quick API test script
echo "🚀 Starting server..."
npm start > /tmp/server-api-test.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

sleep 4

echo ""
echo "🔍 Testing API with Jeremy Montoya (with Medicaid ID)..."
curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17","medicaidId":"0900412827"}' \
  -s

echo ""
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
sleep 1

echo "✅ Test complete!"
