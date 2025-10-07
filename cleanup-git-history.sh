#!/bin/bash

# Git History Cleanup Script
# Removes all sensitive credentials from git history using BFG Repo-Cleaner

set -e  # Exit on error

echo "🔒 GIT HISTORY CLEANUP SCRIPT"
echo "=============================="
echo ""
echo "⚠️  WARNING: This script will rewrite git history!"
echo "⚠️  This is IRREVERSIBLE and will require force-push"
echo "⚠️  Make sure all team members are aware before proceeding"
echo ""

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "❌ ERROR: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ ERROR: You have uncommitted changes. Commit or stash them first."
    git status --short
    exit 1
fi

# Create backup branch
echo "📦 Creating backup branch..."
BACKUP_BRANCH="backup-before-history-cleanup-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo "✅ Backup created: $BACKUP_BRANCH"
echo ""

# Create secrets file for BFG
echo "📝 Creating secrets replacement file..."
cat > secrets.txt <<'EOF'
[[YOUR-USERNAME]]==>[[REDACTED-USERNAME]]
[[YOUR-OLD-PASSWORD]]==>[[REDACTED-PASSWORD]]
[[YOUR-SENDER-ID]]==>[[REDACTED-SENDER-ID]]
[[YOUR-OLD-UHIN-PASSWORD]]==>[[REDACTED-UHIN-PASSWORD]]
[[YOUR-UHIN-USERNAME]]==>[[REDACTED-UHIN-USERNAME]]
[[YOUR-OLD-INTAKEQ-KEY]]==>[[REDACTED-INTAKEQ-KEY]]
[[YOUR-OLD-SUPABASE-ANON-KEY]]==>[[REDACTED-SUPABASE-ANON-KEY]]
[[YOUR-OLD-SUPABASE-SERVICE-KEY]]==>[[REDACTED-SUPABASE-SERVICE-KEY]]
EOF

echo "✅ Secrets file created"
echo ""

# Check if BFG is installed
if ! command -v bfg &> /dev/null; then
    echo "❌ BFG Repo-Cleaner not found!"
    echo ""
    echo "Install BFG with one of these methods:"
    echo "  - macOS: brew install bfg"
    echo "  - Download: https://rtyley.github.io/bfg-repo-cleaner/"
    echo ""
    echo "Alternatively, use git-filter-repo:"
    echo "  - pip install git-filter-repo"
    echo ""
    exit 1
fi

echo "🔍 BFG Repo-Cleaner found: $(which bfg)"
echo ""

# Confirm before proceeding
echo "⚠️  FINAL WARNING:"
echo "   This will replace all credential strings in git history"
echo "   You will need to force-push to origin after this"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted by user"
    rm secrets.txt
    exit 0
fi

echo ""
echo "🚀 Running BFG to clean git history..."
echo "   This may take a few minutes..."
echo ""

# Run BFG
bfg --replace-text secrets.txt

echo ""
echo "✅ BFG completed!"
echo ""

# Clean up reflog and garbage collect
echo "🧹 Cleaning up refs and garbage collecting..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleanup complete!"
echo ""
echo "📊 Repository size before/after:"
du -sh .git

echo ""
echo "🔄 NEXT STEPS:"
echo ""
echo "1. Review the changes:"
echo "   git log --all --oneline | head -20"
echo ""
echo "2. If everything looks good, force-push to origin:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. If something went wrong, restore from backup:"
echo "   git reset --hard $BACKUP_BRANCH"
echo ""
echo "4. Notify all team members that history has been rewritten"
echo "   They will need to: git fetch origin && git reset --hard origin/main"
echo ""
echo "5. Delete backup branch when satisfied:"
echo "   git branch -D $BACKUP_BRANCH"
echo ""
echo "6. Remove secrets.txt:"
echo "   rm secrets.txt"
echo ""
echo "⚠️  Remember to rotate all exposed credentials after pushing!"
echo ""

# Clean up
rm secrets.txt
