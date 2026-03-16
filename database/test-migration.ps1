# Simple Migration Test Script
$ErrorActionPreference = "Continue"

Write-Output "=========================================="
Write-Output "Business Areas Migration Test"
Write-Output "=========================================="
Write-Output ""

# Set password
$env:PGPASSWORD = "Mokshith@21"

# Check current directory
$currentDir = Get-Location
Write-Output "Current Directory: $currentDir"
Write-Output ""

# Check if migration file exists
$migrationFile = "database\migrations\create-business-areas-table.sql"
if (Test-Path $migrationFile) {
    Write-Output "✅ Migration file found: $migrationFile"
} else {
    Write-Output "❌ Migration file NOT found: $migrationFile"
    exit 1
}
Write-Output ""

# Run migration
Write-Output "🔄 Running migration..."
try {
    $migrationOutput = psql -U postgres -d mallyerp -h localhost -f $migrationFile 2>&1
    Write-Output $migrationOutput
    Write-Output ""
    Write-Output "✅ Migration command completed"
} catch {
    Write-Output "❌ Migration error: $_"
}
Write-Output ""

# Verify table exists
Write-Output "🔍 Verifying table..."
$tableCheck = psql -U postgres -d mallyerp -h localhost -t -A -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='business_areas' AND table_schema='public')::text;" 2>&1
Write-Output "Table check result: $tableCheck"

if ($tableCheck -match "t") {
    Write-Output "✅ business_areas table EXISTS!"
} else {
    Write-Output "❌ business_areas table does NOT exist"
}
Write-Output ""

# Get table structure
Write-Output "📊 Table Structure:"
Write-Output "----------------------------------------"
$structure = psql -U postgres -d mallyerp -h localhost -c "\d business_areas" 2>&1
Write-Output $structure
Write-Output ""

# Get column list
Write-Output "📋 Column List:"
Write-Output "----------------------------------------"
$columns = psql -U postgres -d mallyerp -h localhost -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'business_areas' ORDER BY ordinal_position;" 2>&1
Write-Output $columns
Write-Output ""

Write-Output "=========================================="
Write-Output "Test Complete"
Write-Output "=========================================="
