#!/bin/bash

echo "🚀 Starting server..."
npm start > /tmp/server-main-api.log 2>&1 &
SERVER_PID=$!
sleep 4

echo ""
echo "🔍 Test 1: Without Medicaid ID..."
curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17"}' \
  -s | jq '.' 2>/dev/null || echo "(jq not installed)"

echo ""
echo "🔍 Test 2: With Medicaid ID..."
curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17","medicaidId":"0900412827"}' \
  -s | jq '.' 2>/dev/null || curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17","medicaidId":"0900412827"}' \
  -s

echo ""
echo "🔍 Test 3: With SSN last 4..."
curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17","ssn":"1234"}' \
  -s | jq '.' 2>/dev/null || curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17","ssn":"1234"}' \
  -s

echo ""
echo ""
kill $SERVER_PID 2>/dev/null
echo "✅ Done"
