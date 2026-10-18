# PowerShell script to commit and push all changes (excluding .env files)
# Usage: .\commit-and-push.ps1 "Your commit message"

param(
    [string]$CommitMessage = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Git Commit & Push Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: Not a git repository!" -ForegroundColor Red
    Write-Host "   Run this script from the root of your git repo" -ForegroundColor Yellow
    exit 1
}

# Check if .gitignore exists and includes .env
Write-Host "🔍 Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Write-Host "✅ .env files are already in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Adding .env to .gitignore..." -ForegroundColor Yellow
        Add-Content ".gitignore" "`n# Environment variables`n.env`n.env.*`n!.env.example"
        Write-Host "✅ Added .env to .gitignore" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Creating .gitignore..." -ForegroundColor Yellow
    @"
# Environment variables
.env
.env.*
!.env.example

# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Misc
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
"@ | Out-File ".gitignore" -Encoding UTF8
    Write-Host "✅ Created .gitignore" -ForegroundColor Green
}

Write-Host ""

# Show current status
Write-Host "📊 Current Git Status:" -ForegroundColor Cyan
git status --short
Write-Host ""

# Check if there are any changes
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ No changes to commit" -ForegroundColor Green
    Write-Host "   Working tree is clean!" -ForegroundColor Gray
    exit 0
}

# Show what will be committed
Write-Host "📝 Files to be committed:" -ForegroundColor Cyan
git diff --name-only
git diff --cached --name-only
Write-Host ""

# Verify no .env files are staged
Write-Host "🔒 Verifying no .env files are staged..." -ForegroundColor Yellow
$stagedFiles = git diff --cached --name-only
$envFiles = $stagedFiles | Where-Object { $_ -match "\.env" }
if ($envFiles) {
    Write-Host "❌ Error: .env files are staged!" -ForegroundColor Red
    Write-Host "   Files: $($envFiles -join ', ')" -ForegroundColor Red
    Write-Host "   Unstaging .env files..." -ForegroundColor Yellow
    foreach ($file in $envFiles) {
        git reset HEAD $file
    }
    Write-Host "✅ .env files unstaged" -ForegroundColor Green
}
Write-Host ""

# Add all files (respecting .gitignore)
Write-Host "➕ Adding files..." -ForegroundColor Yellow
git add .
Write-Host "✅ Files staged" -ForegroundColor Green
Write-Host ""

# Double-check no .env files after staging
$stagedFilesAfter = git diff --cached --name-only
$envFilesAfter = $stagedFilesAfter | Where-Object { $_ -match "\.env$|\.env\." }
if ($envFilesAfter) {
    Write-Host "❌ Error: .env files detected after staging!" -ForegroundColor Red
    Write-Host "   Files: $($envFilesAfter -join ', ')" -ForegroundColor Red
    Write-Host "   Please check your .gitignore" -ForegroundColor Yellow
    exit 1
}

# Show staged files count
$stagedCount = ($stagedFilesAfter | Measure-Object).Count
Write-Host "📦 Staged files: $stagedCount" -ForegroundColor Cyan
Write-Host ""

# Commit
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
Write-Host "   Message: $CommitMessage" -ForegroundColor Gray
git commit -m "$CommitMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Committed successfully" -ForegroundColor Green
Write-Host ""

# Get current branch
$currentBranch = git branch --show-current
Write-Host "🌿 Current branch: $currentBranch" -ForegroundColor Cyan
Write-Host ""

# Push to remote
Write-Host "🚀 Pushing to remote..." -ForegroundColor Yellow
git push origin $currentBranch

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed!" -ForegroundColor Red
    Write-Host "   You may need to pull first or resolve conflicts" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Pushed successfully!" -ForegroundColor Green
Write-Host ""

# Show final status
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✅ ALL DONE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Final Status:" -ForegroundColor Cyan
git status
Write-Host ""
Write-Host "🎉 Your changes have been committed and pushed!" -ForegroundColor Green
Write-Host "   Commit: $CommitMessage" -ForegroundColor Gray
Write-Host "   Branch: $currentBranch" -ForegroundColor Gray
