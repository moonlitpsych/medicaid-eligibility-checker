#!/bin/bash

# Batch cleanse test files of hardcoded credentials
# This script replaces hardcoded credentials with [REDACTED] placeholders

echo "🔒 Starting batch cleanse of test files..."

# Find all test files with hardcoded credentials
TEST_FILES=(
    "test-office-ally-advanced.js"
    "test-office-ally-exhaustive.js"
    "test-office-ally-final.js"
    "test-office-ally-fixed.js"
    "test-office-ally-nm1-fix.js"
    "test-tella-detailed.js"
    "test-utah-simple.js"
    "debug-uhin-500.js"
    "debug-x12-270-format.js"
    "debug-x12-comparison.js"
)

# Credentials to replace (old values redacted for security)
declare -A REPLACEMENTS=(
    ["[OLD-USERNAME]"]="[REDACTED-USERNAME]"
    ["[OLD-PASSWORD]"]="[REDACTED-PASSWORD]"
    ["1161680"]="[REDACTED-SENDER-ID]"
    ["[OLD-UHIN-PASSWORD]"]="[REDACTED-UHIN-PASSWORD]"
    ["MoonlitProd"]="[REDACTED-UHIN-USERNAME]"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  📝 Cleansing $file..."

        # Replace credentials with environment variables
        sed -i.bak \
            -e "s/username: process.env.OFFICE_ALLY_USERNAME || '[^']*'/username: process.env.OFFICE_ALLY_USERNAME/g" \
            -e "s/password: process.env.OFFICE_ALLY_PASSWORD || '[^']*'/password: process.env.OFFICE_ALLY_PASSWORD/g" \
            -e "s/senderID: '[^']*'/senderID: process.env.OFFICE_ALLY_SENDER_ID/g" \
            -e "s/'[^']*moonlit[^']*'/'[REDACTED-USERNAME]'/g" \
            -e "s/'1161680'/'[REDACTED-SENDER-ID]'/g" \
            -e "s/'MoonlitProd'/'[REDACTED-UHIN-USERNAME]'/g" \
            "$file"

        # Remove backup file
        rm "${file}.bak"
    else
        echo "  ⚠️  File not found: $file"
    fi
done

echo "✅ Batch cleanse complete!"
echo ""
echo "⚠️  IMPORTANT: Test files may no longer work without .env.local credentials"
echo "   Make sure to add require('dotenv').config({ path: '.env.local' }) to test files"
