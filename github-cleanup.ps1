# GitHub Codebase Cleanup Script
# Removes temporary files, debug scripts, and build artifacts

Write-Host "Starting GitHub Codebase Cleanup..." -ForegroundColor Cyan
Write-Host ""

$rootPath = "c:\Users\moksh\Desktop\ELS_Feb_12"
Set-Location $rootPath

# Count files before cleanup
$beforeCount = (Get-ChildItem -Path . -File | Measure-Object).Count
Write-Host "Files before cleanup: $beforeCount" -ForegroundColor Yellow
Write-Host ""

# === STEP 1: Remove temporary .mjs files ===
Write-Host "Removing temporary .mjs debug/test scripts..." -ForegroundColor Green

$tempScripts = @(
    "check-1002.mjs",
    "check-and-fix-1004.mjs",
    "check-both-pg-tables.mjs",
    "check-material-1011.mjs",
    "check-material-type-ranges.mjs",
    "check-number-range-status.mjs",
    "check-pg-schema.mjs",
    "check-purchase-groups.mjs",
    "check-valuation-count.mjs",
    "check-vendor-1010.mjs",
    "check-vendor-schema.mjs",
    "check_api_response.mjs",
    "check_purchase_cols.mjs",
    "create-credit-simple.mjs",
    "create-credit-tables-final.mjs",
    "create-credit-tables.mjs",
    "create-industry-sectors.mjs",
    "create-period-tables.mjs",
    "create-test-data.mjs",
    "deep-dive-debug.mjs",
    "fix-cash-apps.mjs",
    "fix-duplicate-1001.mjs",
    "fix-number-range.mjs",
    "fix-tax-column.mjs",
    "fix-valuation-class-fk.mjs",
    "fix-vendor-purchase-group.mjs",
    "investigate-1001.mjs",
    "investigate-credit-tables.mjs",
    "investigate-valuation-classes.mjs",
    "test-api-endpoints.mjs",
    "test-period-end-closing.mjs",
    "test-tax-fix.mjs",
    "unblock-1003.mjs",
    "unblock-1004.mjs",
    "verify-all-tables.mjs",
    "verify-and-unblock.mjs",
    "verify-credit-tables.mjs",
    "verify-number-ranges.mjs"
)

foreach ($file in $tempScripts) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "   Removed $file" -ForegroundColor DarkGray
    }
}

# === STEP 2: Remove other temporary files ===
Write-Host "Removing cleanup scripts and temporary files..." -ForegroundColor Green

$otherTempFiles = @(
    "debug_db.js",
    "cleanup-for-github.ps1",
    "cleanup-list.txt",
    "safe-cleanup.ps1",
    "verify-db-tables.ps1",
    ".getenv(OPENAI_API_KEY)"
)

foreach ($file in $otherTempFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "   Removed $file" -ForegroundColor DarkGray
    }
}

# === STEP 3: Remove temporary directories ===
Write-Host "Removing temporary directories..." -ForegroundColor Green

$tempDirs = @(
    "25 sep fixed",
    "sample-docs",
    "logs",
    "uploads",
    "dist"
)

foreach ($dir in $tempDirs) {
    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force
        Write-Host "   Removed directory: $dir" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host ""

# Count files after cleanup
$afterCount = (Get-ChildItem -Path . -File | Measure-Object).Count
$removed = $beforeCount - $afterCount

Write-Host "Statistics:" -ForegroundColor Cyan
Write-Host "   Files before: $beforeCount" -ForegroundColor White
Write-Host "   Files after:  $afterCount" -ForegroundColor White
Write-Host "   Removed:      $removed files" -ForegroundColor Yellow
Write-Host ""

# === STEP 4: Verify essential files still exist ===
Write-Host "Verifying essential files..." -ForegroundColor Cyan

$essentialFiles = @(
    "package.json",
    "README.md",
    ".gitignore",
    "tsconfig.json",
    ".env"
)

$allPresent = $true
foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
    }
    else {
        Write-Host "   [MISSING] $file" -ForegroundColor Red
        $allPresent = $false
    }
}

Write-Host ""

# === STEP 5: Verify essential directories still exist ===
Write-Host "Verifying essential directories..." -ForegroundColor Cyan

$essentialDirs = @(
    "client",
    "server",
    "database",
    "scripts",
    "shared"
)

foreach ($dir in $essentialDirs) {
    if (Test-Path $dir) {
        Write-Host "   [OK] $dir/" -ForegroundColor Green
    }
    else {
        Write-Host "   [MISSING] $dir/" -ForegroundColor Red
        $allPresent = $false
    }
}

Write-Host ""

if ($allPresent) {
    Write-Host "All essential files and directories are intact!" -ForegroundColor Green
    Write-Host "Codebase is ready for GitHub!" -ForegroundColor Cyan
}
else {
    Write-Host "WARNING: Some essential files or directories are missing!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next steps: Push to GitHub" -ForegroundColor Yellow
Write-Host "1. git add ." -ForegroundColor White
Write-Host "2. git commit -m 'Clean codebase for production'" -ForegroundColor White
Write-Host "3. git push origin main" -ForegroundColor White
