#!/bin/bash

echo "🌐 Setting up ngrok tunnels for Recovery Day Demo..."

# Kill any existing ngrok processes
pkill -f ngrok

# Start ngrok for both ports in background
echo "🎯 Starting CPSS Interface tunnel (port 3000)..."
ngrok http 3000 --log=stdout > cpss-tunnel.log 2>&1 &
CPSS_PID=$!

echo "📱 Starting Patient App tunnel (port 3002)..."  
ngrok http 3002 --log=stdout > patient-tunnel.log 2>&1 &
PATIENT_PID=$!

# Wait for tunnels to establish
sleep 5

echo ""
echo "🔗 Ngrok Tunnels Active:"
echo "=================================="

# Extract URLs from logs
if [ -f "cpss-tunnel.log" ]; then
    CPSS_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.ngrok\.io' cpss-tunnel.log | head -1)
    if [ ! -z "$CPSS_URL" ]; then
        echo "🎯 CPSS Interface: $CPSS_URL"
        echo "   Demo Page: $CPSS_URL/test-complete-patient-flow.html"
    fi
fi

if [ -f "patient-tunnel.log" ]; then
    PATIENT_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.ngrok\.io' patient-tunnel.log | head -1)
    if [ ! -z "$PATIENT_URL" ]; then
        echo "📱 Patient App: $PATIENT_URL"
        echo "   Enrollment Bridge: $PATIENT_URL/enroll"
    fi
fi

echo ""
echo "💡 For Recovery Day demo:"
echo "   1. Share the CPSS Interface URL with demo attendees"
echo "   2. SMS links will automatically use the Patient App URL"
echo "   3. Update DEPLOYMENT_URL env var if needed:"
if [ ! -z "$PATIENT_URL" ]; then
    echo "      export DEPLOYMENT_URL=$PATIENT_URL"
fi

echo ""
echo "🛑 Press Ctrl+C to stop ngrok tunnels"

# Wait for user to stop
trap 'echo ""; echo "🛑 Stopping ngrok tunnels..."; kill $CPSS_PID $PATIENT_PID 2>/dev/null; rm -f cpss-tunnel.log patient-tunnel.log; echo "✅ Tunnels stopped"; exit 0' INT

# Keep script running
while true; do
    sleep 1
done